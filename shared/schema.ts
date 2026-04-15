import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const videoAnalyses = pgTable("video_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  filesize: integer("filesize").notNull(),
  videoPath: text("video_path").notNull(),
  
  metadata: jsonb("metadata").$type<{
    duration?: number;
    width?: number;
    height?: number;
    codec?: string;
    bitrate?: string;
    framerate?: string;
    creationTime?: string;
    software?: string;
  }>(),
  
  aiScore: integer("ai_score"),
  
  detectionIndicators: jsonb("detection_indicators").$type<Array<{
    name: string;
    detected: boolean;
    confidence: number;
    description: string;
  }>>(),
  
  findings: jsonb("findings").$type<Array<{
    category: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    frameTimestamp?: number;
  }>>(),
  
  plainSummary: text("plain_summary"),
  userEmail: text("user_email"),
  
  detectionMethod: text("detection_method").$type<'hive_ai' | 'gemini' | 'heuristic'>(),
  aiSource: text("ai_source"),
  deepfakeScore: real("deepfake_score"),
  hiveAIResult: jsonb("hive_ai_result").$type<{
    isAIGenerated: boolean;
    aiScore: number;
    isDeepfake: boolean;
    deepfakeScore: number;
    source: string | null;
    sourceConfidence: number;
    detectedSources: Array<{ name: string; confidence: number }>;
  }>(),
  
  status: text("status").notNull().default("pending"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVideoAnalysisSchema = createInsertSchema(videoAnalyses).omit({
  id: true,
  createdAt: true,
});

export type InsertVideoAnalysis = z.infer<typeof insertVideoAnalysisSchema>;
export type VideoAnalysis = typeof videoAnalyses.$inferSelect;

export const nextcloudSettings = pgTable("nextcloud_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  serverUrl: text("server_url").notNull(),
  username: text("username").notNull(),
  appPassword: text("app_password").notNull(),
  watchFolder: text("watch_folder").notNull().default("/AI-Video-Analysis"),
  notificationEmail: text("notification_email").notNull(),
  isActive: integer("is_active").notNull().default(1),
  webhookSecret: text("webhook_secret"),
  lastPolledAt: timestamp("last_polled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNextcloudSettingsSchema = createInsertSchema(nextcloudSettings).omit({
  id: true,
  createdAt: true,
  lastPolledAt: true,
});

export type InsertNextcloudSettings = z.infer<typeof insertNextcloudSettingsSchema>;
export type NextcloudSettings = typeof nextcloudSettings.$inferSelect;

export const nextcloudProcessedFiles = pgTable("nextcloud_processed_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settingsId: varchar("settings_id").notNull(),
  filePath: text("file_path").notNull(),
  fileEtag: text("file_etag"),
  analysisId: varchar("analysis_id"),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});

export const insertNextcloudProcessedFileSchema = createInsertSchema(nextcloudProcessedFiles).omit({
  id: true,
  processedAt: true,
});

export type InsertNextcloudProcessedFile = z.infer<typeof insertNextcloudProcessedFileSchema>;
export type NextcloudProcessedFile = typeof nextcloudProcessedFiles.$inferSelect;
