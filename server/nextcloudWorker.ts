import { storage } from "./storage";
import { NextcloudService, createNextcloudService } from "./nextcloudService";
import { extractMetadata, extractFrames, analyzeVideoFramesWithAI, generatePlainEnglishSummary } from "./videoAnalyzer";
import { sendAnalysisEmail } from "./emailService";
import type { NextcloudSettings, NextcloudProcessedFile } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

interface ProcessingJob {
  settingsId: string;
  filePath: string;
  fileName: string;
  etag: string;
}

const processingQueue: ProcessingJob[] = [];
let isProcessing = false;
let pollingIntervalId: NodeJS.Timeout | null = null;

const POLLING_INTERVAL_MS = 60000;
const TEMP_DIR = "/tmp/nextcloud-videos";

export async function startNextcloudPolling(): Promise<void> {
  console.log("[Nextcloud] Starting polling worker...");
  
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  await pollAllSettings();

  pollingIntervalId = setInterval(async () => {
    await pollAllSettings();
  }, POLLING_INTERVAL_MS);

  processQueue();
}

export function stopNextcloudPolling(): void {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
    console.log("[Nextcloud] Polling worker stopped");
  }
}

async function pollAllSettings(): Promise<void> {
  try {
    const activeSettings = await storage.getActiveNextcloudSettings();
    
    for (const settings of activeSettings) {
      await pollNextcloudFolder(settings);
    }
  } catch (error) {
    console.error("[Nextcloud] Error polling settings:", error);
  }
}

async function pollNextcloudFolder(settings: NextcloudSettings): Promise<void> {
  try {
    const service = createNextcloudService(settings);
    const result = await service.listVideoFiles();
    
    if (result.error) {
      console.error(`[Nextcloud] Error listing files for ${settings.name}:`, result.error);
      return;
    }

    for (const file of result.files) {
      const existingRecord = await storage.getProcessedFile(settings.id, file.path);
      
      if (existingRecord) {
        if (existingRecord.fileEtag === file.etag && existingRecord.status === "completed") {
          continue;
        }
        if (existingRecord.status === "processing") {
          continue;
        }
      }

      const jobExists = processingQueue.some(
        job => job.settingsId === settings.id && job.filePath === file.path
      );
      
      if (!jobExists) {
        processingQueue.push({
          settingsId: settings.id,
          filePath: file.path,
          fileName: file.name,
          etag: file.etag,
        });
        console.log(`[Nextcloud] Queued video for processing: ${file.name}`);
      }
    }

    await storage.updateNextcloudSettings(settings.id, {
      lastPolledAt: new Date(),
    });

    triggerQueueProcessing();
  } catch (error) {
    console.error(`[Nextcloud] Error polling folder for ${settings.name}:`, error);
  }
}

async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;
  
  try {
    while (processingQueue.length > 0) {
      const job = processingQueue.shift();
      
      if (job) {
        await processJob(job);
      }
    }
  } finally {
    isProcessing = false;
  }
}

function triggerQueueProcessing(): void {
  if (!isProcessing && processingQueue.length > 0) {
    processQueue().catch(err => {
      console.error("[Nextcloud] Queue processing error:", err);
    });
  }
}

async function processJob(job: ProcessingJob): Promise<void> {
  console.log(`[Nextcloud] Processing video: ${job.fileName}`);
  
  const settings = await storage.getNextcloudSettings(job.settingsId);
  if (!settings) {
    console.error(`[Nextcloud] Settings not found for ID: ${job.settingsId}`);
    return;
  }

  let processedFileRecord = await storage.getProcessedFile(job.settingsId, job.filePath);
  
  if (!processedFileRecord) {
    processedFileRecord = await storage.createProcessedFile({
      settingsId: job.settingsId,
      filePath: job.filePath,
      fileEtag: job.etag,
      status: "processing",
    });
  } else {
    await storage.updateProcessedFile(processedFileRecord.id, {
      status: "processing",
      fileEtag: job.etag,
    });
  }

  try {
    const service = createNextcloudService(settings);
    
    const localFileName = `${crypto.randomBytes(8).toString("hex")}_${job.fileName}`;
    const localPath = path.join(TEMP_DIR, localFileName);
    
    console.log(`[Nextcloud] Downloading: ${job.fileName}`);
    const downloadResult = await service.downloadFile(job.filePath, localPath);
    
    if (!downloadResult.success) {
      throw new Error(downloadResult.error || "Failed to download file");
    }

    const fileStats = fs.statSync(localPath);
    
    console.log(`[Nextcloud] Analyzing: ${job.fileName}`);
    
    const metadata = await extractMetadata(localPath);
    
    const framesDir = path.join(TEMP_DIR, `frames-${crypto.randomBytes(4).toString("hex")}`);
    fs.mkdirSync(framesDir, { recursive: true });
    const framePaths = await extractFrames(localPath, framesDir, 5);
    
    const analysisResult = await analyzeVideoFramesWithAI(framePaths, metadata);
    const plainSummary = await generatePlainEnglishSummary(analysisResult, job.fileName);

    const analysis = await storage.createVideoAnalysis({
      filename: job.fileName,
      filesize: fileStats.size,
      videoPath: localPath,
      metadata: metadata,
      aiScore: analysisResult.aiScore,
      detectionIndicators: analysisResult.detectionIndicators,
      findings: analysisResult.findings,
      plainSummary: plainSummary,
      userEmail: settings.notificationEmail,
      detectionMethod: analysisResult.detectionMethod,
      aiSource: analysisResult.aiSource,
      deepfakeScore: analysisResult.hiveAIResult?.deepfakeScore ?? null,
      hiveAIResult: analysisResult.hiveAIResult,
      status: "completed",
    });
    
    try {
      fs.rmSync(framesDir, { recursive: true });
    } catch (e) {
    }

    await storage.updateProcessedFile(processedFileRecord.id, {
      status: "completed",
      analysisId: analysis.id,
    });

    console.log(`[Nextcloud] Analysis complete for: ${job.fileName}, sending email...`);
    
    const analysisUrl = `/analysis/${analysis.id}`;
    await sendAnalysisEmail(settings.notificationEmail, {
      filename: analysis.filename,
      aiScore: analysis.aiScore ?? 0,
      plainSummary: analysis.plainSummary ?? "Analysis complete.",
      analysisId: analysis.id,
      analysisUrl,
    });
    
    const archiveFolderPath = `${settings.watchFolder}/processed`;
    await service.createFolder(archiveFolderPath);
    
    const archiveFilePath = `${archiveFolderPath}/${job.fileName}`;
    await service.moveFile(job.filePath, archiveFilePath);
    
    console.log(`[Nextcloud] Moved processed file to: ${archiveFilePath}`);

    try {
      fs.unlinkSync(localPath);
    } catch (e) {
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Nextcloud] Error processing ${job.fileName}:`, errorMessage);
    
    await storage.updateProcessedFile(processedFileRecord.id, {
      status: "failed",
      errorMessage,
    });
  }
}

export async function handleNextcloudWebhook(
  settingsId: string,
  filePath: string,
  fileName: string,
  signature: string,
  payload: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await storage.getNextcloudSettings(settingsId);
    
    if (!settings) {
      return { success: false, error: "Settings not found" };
    }

    if (!settings.webhookSecret) {
      return { success: false, error: "Webhook secret not configured" };
    }

    if (!NextcloudService.verifyWebhookSignature(payload, signature, settings.webhookSecret)) {
      return { success: false, error: "Invalid webhook signature" };
    }

    processingQueue.push({
      settingsId,
      filePath,
      fileName,
      etag: "",
    });

    triggerQueueProcessing();

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export function getQueueStatus(): { queueLength: number; isProcessing: boolean } {
  return {
    queueLength: processingQueue.length,
    isProcessing,
  };
}
