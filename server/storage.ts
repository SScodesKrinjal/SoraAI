import { 
  type VideoAnalysis, 
  type InsertVideoAnalysis, 
  videoAnalyses,
  type NextcloudSettings,
  type InsertNextcloudSettings,
  nextcloudSettings,
  type NextcloudProcessedFile,
  type InsertNextcloudProcessedFile,
  nextcloudProcessedFiles
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  createVideoAnalysis(analysis: InsertVideoAnalysis): Promise<VideoAnalysis>;
  getVideoAnalysis(id: string): Promise<VideoAnalysis | undefined>;
  getAllVideoAnalyses(): Promise<VideoAnalysis[]>;
  updateVideoAnalysis(id: string, updates: Partial<VideoAnalysis>): Promise<VideoAnalysis | undefined>;
  deleteVideoAnalysis(id: string): Promise<boolean>;
  
  createNextcloudSettings(settings: InsertNextcloudSettings): Promise<NextcloudSettings>;
  getNextcloudSettings(id: string): Promise<NextcloudSettings | undefined>;
  getAllNextcloudSettings(): Promise<NextcloudSettings[]>;
  getActiveNextcloudSettings(): Promise<NextcloudSettings[]>;
  updateNextcloudSettings(id: string, updates: Partial<NextcloudSettings>): Promise<NextcloudSettings | undefined>;
  deleteNextcloudSettings(id: string): Promise<boolean>;
  
  createProcessedFile(file: InsertNextcloudProcessedFile): Promise<NextcloudProcessedFile>;
  getProcessedFile(settingsId: string, filePath: string): Promise<NextcloudProcessedFile | undefined>;
  updateProcessedFile(id: string, updates: Partial<NextcloudProcessedFile>): Promise<NextcloudProcessedFile | undefined>;
}

export class MemStorage implements IStorage {
  private videoAnalyses: Map<string, VideoAnalysis>;
  private nextcloudSettingsMap: Map<string, NextcloudSettings>;
  private processedFilesMap: Map<string, NextcloudProcessedFile>;

  constructor() {
    this.videoAnalyses = new Map();
    this.nextcloudSettingsMap = new Map();
    this.processedFilesMap = new Map();
  }

  async createVideoAnalysis(insertAnalysis: InsertVideoAnalysis): Promise<VideoAnalysis> {
    const id = randomUUID();
    const analysis: VideoAnalysis = {
      id,
      filename: insertAnalysis.filename,
      filesize: insertAnalysis.filesize,
      videoPath: insertAnalysis.videoPath,
      metadata: insertAnalysis.metadata ?? null,
      aiScore: insertAnalysis.aiScore ?? null,
      detectionIndicators: insertAnalysis.detectionIndicators ?? null,
      findings: insertAnalysis.findings ?? null,
      plainSummary: insertAnalysis.plainSummary ?? null,
      userEmail: insertAnalysis.userEmail ?? null,
      detectionMethod: insertAnalysis.detectionMethod ?? null,
      aiSource: insertAnalysis.aiSource ?? null,
      deepfakeScore: insertAnalysis.deepfakeScore ?? null,
      hiveAIResult: insertAnalysis.hiveAIResult ?? null,
      status: insertAnalysis.status ?? "pending",
      createdAt: new Date(),
    };
    this.videoAnalyses.set(id, analysis);
    return analysis;
  }

  async getVideoAnalysis(id: string): Promise<VideoAnalysis | undefined> {
    return this.videoAnalyses.get(id);
  }

  async getAllVideoAnalyses(): Promise<VideoAnalysis[]> {
    return Array.from(this.videoAnalyses.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async updateVideoAnalysis(id: string, updates: Partial<VideoAnalysis>): Promise<VideoAnalysis | undefined> {
    const existing = this.videoAnalyses.get(id);
    if (!existing) return undefined;

    const updated: VideoAnalysis = { ...existing, ...updates };
    this.videoAnalyses.set(id, updated);
    return updated;
  }

  async deleteVideoAnalysis(id: string): Promise<boolean> {
    return this.videoAnalyses.delete(id);
  }

  async createNextcloudSettings(settings: InsertNextcloudSettings): Promise<NextcloudSettings> {
    const id = randomUUID();
    const newSettings: NextcloudSettings = {
      id,
      name: settings.name,
      serverUrl: settings.serverUrl,
      username: settings.username,
      appPassword: settings.appPassword,
      watchFolder: settings.watchFolder ?? "/AI-Video-Analysis",
      notificationEmail: settings.notificationEmail,
      isActive: settings.isActive ?? 1,
      webhookSecret: settings.webhookSecret ?? null,
      lastPolledAt: null,
      createdAt: new Date(),
    };
    this.nextcloudSettingsMap.set(id, newSettings);
    return newSettings;
  }

  async getNextcloudSettings(id: string): Promise<NextcloudSettings | undefined> {
    return this.nextcloudSettingsMap.get(id);
  }

  async getAllNextcloudSettings(): Promise<NextcloudSettings[]> {
    return Array.from(this.nextcloudSettingsMap.values());
  }

  async getActiveNextcloudSettings(): Promise<NextcloudSettings[]> {
    return Array.from(this.nextcloudSettingsMap.values()).filter(s => s.isActive === 1);
  }

  async updateNextcloudSettings(id: string, updates: Partial<NextcloudSettings>): Promise<NextcloudSettings | undefined> {
    const existing = this.nextcloudSettingsMap.get(id);
    if (!existing) return undefined;
    const updated: NextcloudSettings = { ...existing, ...updates };
    this.nextcloudSettingsMap.set(id, updated);
    return updated;
  }

  async deleteNextcloudSettings(id: string): Promise<boolean> {
    return this.nextcloudSettingsMap.delete(id);
  }

  async createProcessedFile(file: InsertNextcloudProcessedFile): Promise<NextcloudProcessedFile> {
    const id = randomUUID();
    const newFile: NextcloudProcessedFile = {
      id,
      settingsId: file.settingsId,
      filePath: file.filePath,
      fileEtag: file.fileEtag ?? null,
      analysisId: file.analysisId ?? null,
      status: file.status ?? "pending",
      errorMessage: file.errorMessage ?? null,
      processedAt: new Date(),
    };
    this.processedFilesMap.set(id, newFile);
    return newFile;
  }

  async getProcessedFile(settingsId: string, filePath: string): Promise<NextcloudProcessedFile | undefined> {
    return Array.from(this.processedFilesMap.values()).find(
      f => f.settingsId === settingsId && f.filePath === filePath
    );
  }

  async updateProcessedFile(id: string, updates: Partial<NextcloudProcessedFile>): Promise<NextcloudProcessedFile | undefined> {
    const existing = this.processedFilesMap.get(id);
    if (!existing) return undefined;
    const updated: NextcloudProcessedFile = { ...existing, ...updates };
    this.processedFilesMap.set(id, updated);
    return updated;
  }
}

export class DbStorage implements IStorage {
  async createVideoAnalysis(insertAnalysis: InsertVideoAnalysis): Promise<VideoAnalysis> {
    const [analysis] = await db.insert(videoAnalyses).values(insertAnalysis).returning();
    return analysis;
  }

  async getVideoAnalysis(id: string): Promise<VideoAnalysis | undefined> {
    const [analysis] = await db.select().from(videoAnalyses).where(eq(videoAnalyses.id, id));
    return analysis;
  }

  async getAllVideoAnalyses(): Promise<VideoAnalysis[]> {
    return await db.select().from(videoAnalyses).orderBy(desc(videoAnalyses.createdAt));
  }

  async updateVideoAnalysis(id: string, updates: Partial<VideoAnalysis>): Promise<VideoAnalysis | undefined> {
    const [updated] = await db
      .update(videoAnalyses)
      .set(updates)
      .where(eq(videoAnalyses.id, id))
      .returning();
    return updated;
  }

  async deleteVideoAnalysis(id: string): Promise<boolean> {
    const result = await db.delete(videoAnalyses).where(eq(videoAnalyses.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async createNextcloudSettings(settings: InsertNextcloudSettings): Promise<NextcloudSettings> {
    const [newSettings] = await db.insert(nextcloudSettings).values(settings).returning();
    return newSettings;
  }

  async getNextcloudSettings(id: string): Promise<NextcloudSettings | undefined> {
    const [settings] = await db.select().from(nextcloudSettings).where(eq(nextcloudSettings.id, id));
    return settings;
  }

  async getAllNextcloudSettings(): Promise<NextcloudSettings[]> {
    return await db.select().from(nextcloudSettings).orderBy(desc(nextcloudSettings.createdAt));
  }

  async getActiveNextcloudSettings(): Promise<NextcloudSettings[]> {
    return await db.select().from(nextcloudSettings).where(eq(nextcloudSettings.isActive, 1));
  }

  async updateNextcloudSettings(id: string, updates: Partial<NextcloudSettings>): Promise<NextcloudSettings | undefined> {
    const [updated] = await db
      .update(nextcloudSettings)
      .set(updates)
      .where(eq(nextcloudSettings.id, id))
      .returning();
    return updated;
  }

  async deleteNextcloudSettings(id: string): Promise<boolean> {
    const result = await db.delete(nextcloudSettings).where(eq(nextcloudSettings.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async createProcessedFile(file: InsertNextcloudProcessedFile): Promise<NextcloudProcessedFile> {
    const [newFile] = await db.insert(nextcloudProcessedFiles).values(file).returning();
    return newFile;
  }

  async getProcessedFile(settingsId: string, filePath: string): Promise<NextcloudProcessedFile | undefined> {
    const [file] = await db.select().from(nextcloudProcessedFiles).where(
      and(
        eq(nextcloudProcessedFiles.settingsId, settingsId),
        eq(nextcloudProcessedFiles.filePath, filePath)
      )
    );
    return file;
  }

  async updateProcessedFile(id: string, updates: Partial<NextcloudProcessedFile>): Promise<NextcloudProcessedFile | undefined> {
    const [updated] = await db
      .update(nextcloudProcessedFiles)
      .set(updates)
      .where(eq(nextcloudProcessedFiles.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DbStorage();
