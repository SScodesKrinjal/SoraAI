import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import * as fs from "fs";
import * as path from "path";
import { lookup } from "dns/promises";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { extractMetadata, analyzeVideoFramesWithAI, extractFrames, generatePlainEnglishSummary } from "./videoAnalyzer";
import { sendAnalysisEmail, isEmailConfigured, isValidEmail } from "./emailService";
import { createNextcloudService, NextcloudService } from "./nextcloudService";
import { startNextcloudPolling, handleNextcloudWebhook, getQueueStatus } from "./nextcloudWorker";
import { insertNextcloudSettingsSchema } from "@shared/schema";

function isPrivateOrReservedIP(ip: string): boolean {
  if (ip.includes(':')) {
    const lower = ip.toLowerCase();
    return (
      lower === '::1' ||
      lower === '::' ||
      lower.startsWith('::1') ||
      lower.startsWith('fe80:') ||
      lower.startsWith('fe80::') ||
      lower.startsWith('fc00:') ||
      lower.startsWith('fd00:') ||
      lower.startsWith('ff00:') ||
      lower.startsWith('::ffff:127.') ||
      lower.startsWith('::ffff:10.') ||
      lower.startsWith('::ffff:172.') ||
      lower.startsWith('::ffff:192.168.') ||
      lower.startsWith('::ffff:169.254.') ||
      lower.startsWith('64:ff9b::') ||
      lower.startsWith('100::') ||
      lower.startsWith('2001:0:') ||
      lower.startsWith('2001:db8:')
    );
  }
  
  const parts = ip.split('.').map(Number);
  
  if (parts.length !== 4 || parts.some(isNaN)) {
    return true;
  }
  
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 169 && parts[1] === 254) ||
    parts[0] === 0 ||
    parts[0] >= 224
  );
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, MOV, AVI, and WebM are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  const objectStorageService = new ObjectStorageService();

  app.post("/api/analyze-video", upload.single('video'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No video file uploaded" });
      }

      let userEmail = req.body?.email?.trim() || null;
      
      if (userEmail && !isValidEmail(userEmail)) {
        userEmail = null;
        console.log("Invalid email format provided, ignoring email notification");
      }
      
      console.log(`Analyzing video: ${req.file.originalname} (${req.file.size} bytes)${userEmail ? ` - notify: ${userEmail}` : ''}`);

      const tempDir = path.join(process.cwd(), 'temp');
      await fs.promises.mkdir(tempDir, { recursive: true });

      const tempFilename = `${Date.now()}-${req.file.originalname}`;
      const tempVideoPath = path.join(tempDir, tempFilename);
      await fs.promises.writeFile(tempVideoPath, req.file.buffer);

      let videoPath: string;
      let shouldDeleteTempFile = true;
      
      try {
        videoPath = await objectStorageService.uploadVideoFile(
          req.file.buffer,
          req.file.originalname
        );
        console.log(`Uploaded video to storage: ${videoPath}`);
      } catch (error) {
        console.error("Storage upload error, keeping video in temp folder:", error);
        videoPath = `/temp/${tempFilename}`;
        shouldDeleteTempFile = false;
      }

      console.log("Extracting metadata...");
      const metadata = await extractMetadata(tempVideoPath);
      console.log("Metadata extracted:", metadata);

      console.log("Extracting frames...");
      const framesDir = path.join(tempDir, `frames-${Date.now()}`);
      const framePaths = await extractFrames(tempVideoPath, framesDir, 5);
      console.log(`Extracted ${framePaths.length} frames`);

      console.log("Analyzing frames with AI...");
      const analysisResult = await analyzeVideoFramesWithAI(framePaths, metadata);
      console.log("AI analysis complete");

      console.log("Generating plain English summary...");
      const plainSummary = await generatePlainEnglishSummary(analysisResult, req.file.originalname);

      const videoAnalysis = await storage.createVideoAnalysis({
        filename: req.file.originalname,
        filesize: req.file.size,
        videoPath,
        metadata: analysisResult.metadata,
        aiScore: analysisResult.aiScore,
        detectionIndicators: analysisResult.detectionIndicators,
        findings: analysisResult.findings,
        plainSummary,
        userEmail,
        detectionMethod: analysisResult.detectionMethod,
        aiSource: analysisResult.aiSource || null,
        deepfakeScore: analysisResult.hiveAIResult?.deepfakeScore || null,
        hiveAIResult: analysisResult.hiveAIResult ? {
          isAIGenerated: analysisResult.hiveAIResult.isAIGenerated,
          aiScore: analysisResult.hiveAIResult.aiScore,
          isDeepfake: analysisResult.hiveAIResult.isDeepfake,
          deepfakeScore: analysisResult.hiveAIResult.deepfakeScore,
          source: analysisResult.hiveAIResult.source,
          sourceConfidence: analysisResult.hiveAIResult.sourceConfidence,
          detectedSources: analysisResult.hiveAIResult.detectedSources
        } : null,
        status: "completed"
      });

      if (shouldDeleteTempFile) {
        await fs.promises.rm(tempVideoPath, { force: true });
      }
      await fs.promises.rm(framesDir, { recursive: true, force: true });

      if (userEmail && isEmailConfigured()) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const analysisUrl = `${baseUrl}/analysis/${videoAnalysis.id}`;
        
        sendAnalysisEmail(userEmail, {
          filename: req.file.originalname,
          aiScore: analysisResult.aiScore,
          plainSummary,
          analysisId: videoAnalysis.id,
          analysisUrl
        }).catch(err => {
          console.error("Failed to send notification email:", err);
        });
      }

      res.json(videoAnalysis);
    } catch (error) {
      console.error("Video analysis error:", error);
      res.status(500).json({ 
        error: "Failed to analyze video",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/analyze-video-url", async (req, res) => {
    try {
      const { url, email } = req.body;
      let userEmail = email?.trim() || null;
      
      if (userEmail && !isValidEmail(userEmail)) {
        userEmail = null;
        console.log("Invalid email format provided, ignoring email notification");
      }

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "No video URL provided" });
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch (error) {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return res.status(400).json({ error: "Only HTTP and HTTPS protocols are allowed" });
      }

      const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254'];
      const hostname = parsedUrl.hostname.toLowerCase();
      if (blockedHosts.some(blocked => hostname === blocked || hostname.endsWith('.' + blocked))) {
        return res.status(400).json({ error: "Access to internal network resources is not allowed" });
      }

      if (hostname.match(/^(10|172\.(1[6-9]|2[0-9]|3[01])|192\.168)\./)) {
        return res.status(400).json({ error: "Access to private network ranges is not allowed" });
      }

      let resolvedIPs: string[];
      try {
        const dnsResult = await lookup(hostname, { all: true });
        resolvedIPs = dnsResult.map(r => r.address);
      } catch (error) {
        return res.status(400).json({ error: "Failed to resolve hostname" });
      }

      for (const ip of resolvedIPs) {
        if (isPrivateOrReservedIP(ip)) {
          return res.status(400).json({ error: "URL resolves to a private or reserved IP address" });
        }
      }

      console.log(`Analyzing video from URL: ${url}`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      let response: Response;
      try {
        response = await fetch(url, {
          signal: controller.signal,
          redirect: 'follow',
          headers: {
            'User-Agent': 'AI-Video-Detective/1.0'
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        if (error instanceof Error && error.name === 'AbortError') {
          return res.status(408).json({ error: "Request timeout - video download took too long" });
        }
        return res.status(400).json({ error: `Failed to download video: ${error instanceof Error ? error.message : 'Unknown error'}` });
      } finally {
        clearTimeout(timeout);
      }
      
      if (!response.ok) {
        return res.status(400).json({ error: `Failed to download video: ${response.status} ${response.statusText}` });
      }

      const contentType = response.headers.get('content-type');
      const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
      
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        return res.status(400).json({ error: 'Invalid content type. Only MP4, MOV, AVI, and WebM videos are allowed.' });
      }

      const contentLength = response.headers.get('content-length');
      const maxSize = 500 * 1024 * 1024;
      
      if (contentLength && parseInt(contentLength) > maxSize) {
        return res.status(400).json({ error: 'Video file too large. Maximum size is 500MB.' });
      }

      const chunks: Uint8Array[] = [];
      let downloadedSize = 0;
      
      if (!response.body) {
        return res.status(400).json({ error: "No response body received" });
      }

      const reader = response.body.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          if (value) {
            downloadedSize += value.length;
            
            if (downloadedSize > maxSize) {
              return res.status(400).json({ error: 'Video file too large. Maximum size is 500MB.' });
            }
            
            chunks.push(value);
          }
        }
      } finally {
        reader.releaseLock();
      }

      const videoBuffer = Buffer.concat(chunks);

      const urlObj = new URL(url);
      const filename = path.basename(urlObj.pathname) || 'video.mp4';

      console.log(`Downloaded video: ${filename} (${videoBuffer.length} bytes)`);

      const tempDir = path.join(process.cwd(), 'temp');
      await fs.promises.mkdir(tempDir, { recursive: true });

      const tempFilename = `${Date.now()}-${filename}`;
      const tempVideoPath = path.join(tempDir, tempFilename);
      await fs.promises.writeFile(tempVideoPath, videoBuffer);

      let videoPath: string;
      let shouldDeleteTempFile = true;
      
      try {
        videoPath = await objectStorageService.uploadVideoFile(
          videoBuffer,
          filename
        );
        console.log(`Uploaded video to storage: ${videoPath}`);
      } catch (error) {
        console.error("Storage upload error, keeping video in temp folder:", error);
        videoPath = `/temp/${tempFilename}`;
        shouldDeleteTempFile = false;
      }

      console.log("Extracting metadata...");
      const metadata = await extractMetadata(tempVideoPath);
      console.log("Metadata extracted:", metadata);

      console.log("Extracting frames...");
      const framesDir = path.join(tempDir, `frames-${Date.now()}`);
      const framePaths = await extractFrames(tempVideoPath, framesDir, 5);
      console.log(`Extracted ${framePaths.length} frames`);

      console.log("Analyzing frames with AI...");
      const analysisResult = await analyzeVideoFramesWithAI(framePaths, metadata);
      console.log("AI analysis complete");

      console.log("Generating plain English summary...");
      const plainSummary = await generatePlainEnglishSummary(analysisResult, filename);

      const videoAnalysis = await storage.createVideoAnalysis({
        filename,
        filesize: videoBuffer.length,
        videoPath,
        metadata: analysisResult.metadata,
        aiScore: analysisResult.aiScore,
        detectionIndicators: analysisResult.detectionIndicators,
        findings: analysisResult.findings,
        plainSummary,
        userEmail,
        detectionMethod: analysisResult.detectionMethod,
        aiSource: analysisResult.aiSource || null,
        deepfakeScore: analysisResult.hiveAIResult?.deepfakeScore || null,
        hiveAIResult: analysisResult.hiveAIResult ? {
          isAIGenerated: analysisResult.hiveAIResult.isAIGenerated,
          aiScore: analysisResult.hiveAIResult.aiScore,
          isDeepfake: analysisResult.hiveAIResult.isDeepfake,
          deepfakeScore: analysisResult.hiveAIResult.deepfakeScore,
          source: analysisResult.hiveAIResult.source,
          sourceConfidence: analysisResult.hiveAIResult.sourceConfidence,
          detectedSources: analysisResult.hiveAIResult.detectedSources
        } : null,
        status: "completed"
      });

      if (shouldDeleteTempFile) {
        await fs.promises.rm(tempVideoPath, { force: true });
      }
      await fs.promises.rm(framesDir, { recursive: true, force: true });

      if (userEmail && isEmailConfigured()) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const analysisUrl = `${baseUrl}/analysis/${videoAnalysis.id}`;
        
        sendAnalysisEmail(userEmail, {
          filename,
          aiScore: analysisResult.aiScore,
          plainSummary,
          analysisId: videoAnalysis.id,
          analysisUrl
        }).catch(err => {
          console.error("Failed to send notification email:", err);
        });
      }

      res.json(videoAnalysis);
    } catch (error) {
      console.error("Video URL analysis error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const statusCode = errorMessage.includes('timeout') ? 408 : 500;
      
      res.status(statusCode).json({ 
        error: "Failed to analyze video from URL",
        details: errorMessage
      });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.get("/temp/:filename", async (req, res) => {
    try {
      const tempDir = path.join(process.cwd(), 'temp');
      const requestedFile = path.basename(req.params.filename);
      const filePath = path.join(tempDir, requestedFile);
      
      const resolvedPath = path.resolve(filePath);
      const resolvedTempDir = path.resolve(tempDir);
      
      if (!resolvedPath.startsWith(resolvedTempDir + path.sep)) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }

      res.sendFile(filePath);
    } catch (error) {
      console.error("Error serving temp file:", error);
      res.status(500).json({ error: "Error serving file" });
    }
  });

  app.get("/api/analyses", async (req, res) => {
    try {
      const analyses = await storage.getAllVideoAnalyses();
      res.json(analyses);
    } catch (error) {
      console.error("Error fetching analyses:", error);
      res.status(500).json({ error: "Failed to fetch analyses" });
    }
  });

  app.get("/api/analyses/:id", async (req, res) => {
    try {
      const analysis = await storage.getVideoAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching analysis:", error);
      res.status(500).json({ error: "Failed to fetch analysis" });
    }
  });

  app.get("/api/analyses/:id/download", async (req, res) => {
    try {
      const analysis = await storage.getVideoAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      const aiScore = analysis.aiScore ?? 0;
      const report = {
        reportGeneratedAt: new Date().toISOString(),
        videoFilename: analysis.filename,
        analysisDate: analysis.createdAt,
        aiGenerationLikelihood: {
          score: aiScore,
          interpretation: aiScore >= 70 ? "Likely AI-Generated" : 
                         aiScore >= 40 ? "Uncertain" : 
                         "Likely Authentic"
        },
        videoMetadata: analysis.metadata,
        detectionIndicators: analysis.detectionIndicators,
        findings: analysis.findings,
        technicalDetails: {
          filesize: `${(analysis.filesize / (1024 * 1024)).toFixed(2)} MB`,
          analysisStatus: analysis.status
        }
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="analysis-report-${analysis.filename}.json"`);
      res.send(JSON.stringify(report, null, 2));
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  app.get("/api/nextcloud/settings", async (req, res) => {
    try {
      const settings = await storage.getAllNextcloudSettings();
      const safeSettings = settings.map(s => ({
        ...s,
        appPassword: "********",
      }));
      res.json(safeSettings);
    } catch (error) {
      console.error("Error fetching Nextcloud settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.get("/api/nextcloud/settings/:id", async (req, res) => {
    try {
      const settings = await storage.getNextcloudSettings(req.params.id);
      if (!settings) {
        return res.status(404).json({ error: "Settings not found" });
      }
      res.json({
        ...settings,
        appPassword: "********",
      });
    } catch (error) {
      console.error("Error fetching Nextcloud settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/nextcloud/settings", async (req, res) => {
    try {
      const bodyWithConversions = {
        ...req.body,
        isActive: typeof req.body.isActive === 'boolean' 
          ? (req.body.isActive ? 1 : 0) 
          : req.body.isActive,
      };
      
      const parseResult = insertNextcloudSettingsSchema.safeParse(bodyWithConversions);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid settings data", 
          details: parseResult.error.issues 
        });
      }

      const webhookSecret = NextcloudService.generateWebhookSecret();
      const settings = await storage.createNextcloudSettings({
        ...parseResult.data,
        webhookSecret,
      });

      res.status(201).json({
        ...settings,
        appPassword: "********",
      });
    } catch (error) {
      console.error("Error creating Nextcloud settings:", error);
      res.status(500).json({ error: "Failed to create settings" });
    }
  });

  app.put("/api/nextcloud/settings/:id", async (req, res) => {
    try {
      const existing = await storage.getNextcloudSettings(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Settings not found" });
      }

      const updates = { ...req.body };
      if (updates.appPassword === "********") {
        delete updates.appPassword;
      }
      if (typeof updates.isActive === 'boolean') {
        updates.isActive = updates.isActive ? 1 : 0;
      }

      const updated = await storage.updateNextcloudSettings(req.params.id, updates);
      res.json({
        ...updated,
        appPassword: "********",
      });
    } catch (error) {
      console.error("Error updating Nextcloud settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.delete("/api/nextcloud/settings/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteNextcloudSettings(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Settings not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting Nextcloud settings:", error);
      res.status(500).json({ error: "Failed to delete settings" });
    }
  });

  app.post("/api/nextcloud/settings/:id/test", async (req, res) => {
    try {
      const settings = await storage.getNextcloudSettings(req.params.id);
      if (!settings) {
        return res.status(404).json({ error: "Settings not found" });
      }

      const service = createNextcloudService(settings);
      const result = await service.testConnection();
      
      if (result.success) {
        res.json({ success: true, message: "Connection successful!" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("Error testing Nextcloud connection:", error);
      res.status(500).json({ error: "Failed to test connection" });
    }
  });

  app.post("/api/nextcloud/webhook/:settingsId", async (req, res) => {
    try {
      const signature = req.headers["x-nextcloud-signature"] as string || "";
      const payload = JSON.stringify(req.body);
      
      const { filePath, fileName } = req.body;
      
      if (!filePath || !fileName) {
        return res.status(400).json({ error: "Missing file information" });
      }

      const result = await handleNextcloudWebhook(
        req.params.settingsId,
        filePath,
        fileName,
        signature,
        payload
      );

      if (result.success) {
        res.status(202).json({ message: "Video queued for analysis" });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("Error handling Nextcloud webhook:", error);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  app.get("/api/nextcloud/status", async (req, res) => {
    try {
      const status = getQueueStatus();
      const activeSettings = await storage.getActiveNextcloudSettings();
      
      res.json({
        pollingActive: true,
        ...status,
        activeConnections: activeSettings.length,
      });
    } catch (error) {
      console.error("Error getting Nextcloud status:", error);
      res.status(500).json({ error: "Failed to get status" });
    }
  });

  startNextcloudPolling();

  const httpServer = createServer(app);
  return httpServer;
}
