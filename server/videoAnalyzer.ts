import * as fs from "fs";
import * as path from "path";
import ffmpeg from "fluent-ffmpeg";
import { GoogleGenAI } from "@google/genai";
import { analyzeFrameWithHiveAI, isHiveAIConfigured, generateHiveSummary, HiveAIResult } from "./hiveAIService";

const hasGeminiKey = !!process.env.GEMINI_API_KEY;
const ai = hasGeminiKey ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! }) : null;

export interface VideoMetadata {
  duration?: number;
  width?: number;
  height?: number;
  codec?: string;
  bitrate?: string;
  framerate?: string;
  creationTime?: string;
  software?: string;
}

export interface DetectionIndicator {
  name: string;
  detected: boolean;
  confidence: number;
  description: string;
}

export interface Finding {
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  frameTimestamp?: number;
}

export interface AnalysisResult {
  metadata: VideoMetadata;
  aiScore: number;
  detectionIndicators: DetectionIndicator[];
  findings: Finding[];
  hiveAIResult?: HiveAIResult;
  detectionMethod: 'hive_ai' | 'gemini' | 'heuristic';
  aiSource?: string;
}

export async function extractMetadata(videoPath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const formatTags = metadata.format.tags || {};

      const result: VideoMetadata = {
        duration: metadata.format.duration,
        width: videoStream?.width,
        height: videoStream?.height,
        codec: videoStream?.codec_name,
        bitrate: metadata.format.bit_rate ? `${Math.round(parseInt(String(metadata.format.bit_rate)) / 1000)} kbps` : undefined,
        framerate: videoStream?.r_frame_rate,
        creationTime: String(formatTags.creation_time || formatTags.date || ''),
        software: String(formatTags.encoder || formatTags.software || ''),
      };

      resolve(result);
    });
  });
}

export async function extractFrames(videoPath: string, outputDir: string, count: number = 5): Promise<string[]> {
  await fs.promises.mkdir(outputDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const framePaths: string[] = [];

    ffmpeg(videoPath)
      .screenshots({
        count,
        folder: outputDir,
        filename: 'frame-%i.jpg',
        size: '640x?'
      })
      .on('end', () => {
        const frames = Array.from({ length: count }, (_, i) => 
          path.join(outputDir, `frame-${i + 1}.jpg`)
        );
        resolve(frames);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

export async function analyzeVideoWithAI(
  videoPath: string,
  metadata: VideoMetadata
): Promise<AnalysisResult> {
  try {
    const videoBytes = fs.readFileSync(videoPath);
    const videoBase64 = videoBytes.toString("base64");

    const prompt = `You are an expert in detecting AI-generated videos, including content from tools like Sora 2, Runway, and other AI video generators.

Analyze this video for signs of AI generation. Look for:
1. **Watermark Removal**: Signs that a watermark was removed or hidden
2. **Synthetic Artifacts**: Unnatural textures, morphing objects, impossible physics
3. **Temporal Inconsistencies**: Sudden changes in lighting, objects appearing/disappearing
4. **Unnatural Motion**: Physics-defying movements, jerky camera work, unrealistic motion blur
5. **Lighting Anomalies**: Inconsistent shadows, unrealistic reflections, impossible lighting

Provide your analysis in JSON format with:
- aiScore (0-100): Likelihood this is AI-generated (0 = authentic, 100 = definitely AI)
- detectionIndicators: Array of detected patterns with confidence scores
- findings: Specific observations with severity levels

Be thorough but accurate. If something is uncertain, reflect that in lower confidence scores.`;

    if (!ai) {
      throw new Error("Gemini AI not configured");
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            aiScore: { type: "number" },
            detectionIndicators: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  detected: { type: "boolean" },
                  confidence: { type: "number" },
                  description: { type: "string" }
                }
              }
            },
            findings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string" },
                  frameTimestamp: { type: "number" }
                }
              }
            }
          },
          required: ["aiScore", "detectionIndicators", "findings"]
        }
      },
      contents: [
        {
          inlineData: {
            data: videoBase64,
            mimeType: "video/mp4",
          },
        },
        prompt
      ],
    });

    const rawJson = response.text;
    if (!rawJson) {
      throw new Error("Empty response from Gemini");
    }

    const aiAnalysis = JSON.parse(rawJson);

    return {
      metadata,
      aiScore: Math.min(100, Math.max(0, aiAnalysis.aiScore || 0)),
      detectionIndicators: aiAnalysis.detectionIndicators || [],
      findings: aiAnalysis.findings || [],
      detectionMethod: 'gemini'
    };
  } catch (error) {
    console.error("AI analysis error:", error);
    
    return {
      metadata,
      aiScore: 50,
      detectionIndicators: [
        {
          name: "Analysis Error",
          detected: false,
          confidence: 0,
          description: "Could not complete AI analysis. Manual review recommended."
        }
      ],
      findings: [
        {
          category: "Technical",
          description: "AI analysis encountered an error. Results may be incomplete.",
          severity: "medium"
        }
      ],
      detectionMethod: 'heuristic'
    };
  }
}

export async function analyzeVideoFramesWithAI(framePaths: string[], metadata: VideoMetadata): Promise<AnalysisResult> {
  if (isHiveAIConfigured()) {
    console.log("[Video Analyzer] Using Hive AI for detection");
    return analyzeWithHiveAIMethod(framePaths, metadata);
  }
  
  if (!ai || !hasGeminiKey) {
    console.warn("No AI detection configured, using heuristic analysis");
    return performHeuristicAnalysis(metadata);
  }

  console.log("[Video Analyzer] Using Gemini for detection (Hive AI not configured)");
  return analyzeWithGeminiMethod(framePaths, metadata);
}

async function analyzeWithHiveAIMethod(framePaths: string[], metadata: VideoMetadata): Promise<AnalysisResult> {
  try {
    const frameResults: HiveAIResult[] = [];
    
    for (let i = 0; i < Math.min(framePaths.length, 5); i++) {
      const framePath = framePaths[i];
      if (fs.existsSync(framePath)) {
        const result = await analyzeFrameWithHiveAI(framePath);
        if (result.success && result.result) {
          frameResults.push(result.result);
        }
      }
    }

    if (frameResults.length === 0) {
      console.warn("[Hive AI] No frames could be analyzed, falling back to heuristic");
      return performHeuristicAnalysis(metadata);
    }

    const avgAIScore = frameResults.reduce((sum, r) => sum + r.aiScore, 0) / frameResults.length;
    const avgDeepfakeScore = frameResults.reduce((sum, r) => sum + r.deepfakeScore, 0) / frameResults.length;
    const maxAIScore = Math.max(...frameResults.map(r => r.aiScore));
    const maxDeepfakeScore = Math.max(...frameResults.map(r => r.deepfakeScore));

    const combinedScore = Math.round(Math.max(avgAIScore, avgDeepfakeScore) * 100);

    const sourceCounts: Record<string, { count: number; confidence: number }> = {};
    for (const result of frameResults) {
      if (result.source && result.source !== "Not AI-Generated" && result.source !== "Inconclusive") {
        if (!sourceCounts[result.source]) {
          sourceCounts[result.source] = { count: 0, confidence: 0 };
        }
        sourceCounts[result.source].count++;
        sourceCounts[result.source].confidence = Math.max(sourceCounts[result.source].confidence, result.sourceConfidence);
      }
    }

    const detectedSource = Object.entries(sourceCounts)
      .sort((a, b) => b[1].count - a[1].count || b[1].confidence - a[1].confidence)[0]?.[0] || null;

    const indicators = generateHiveIndicators(frameResults, combinedScore);
    const findings = generateHiveFindings(frameResults, combinedScore, detectedSource);

    const aggregatedHiveResult: HiveAIResult = {
      isAIGenerated: maxAIScore >= 0.5,
      aiScore: avgAIScore,
      isDeepfake: maxDeepfakeScore >= 0.5,
      deepfakeScore: avgDeepfakeScore,
      source: detectedSource,
      sourceConfidence: sourceCounts[detectedSource || '']?.confidence || 0,
      rawResponse: frameResults.map(r => r.rawResponse),
      detectedSources: Object.entries(sourceCounts)
        .map(([name, data]) => ({ name, confidence: data.confidence }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5)
    };

    return {
      metadata,
      aiScore: combinedScore,
      detectionIndicators: indicators,
      findings,
      hiveAIResult: aggregatedHiveResult,
      detectionMethod: 'hive_ai',
      aiSource: detectedSource || undefined
    };
  } catch (error) {
    console.error("[Hive AI] Analysis error, falling back to heuristic:", error);
    return performHeuristicAnalysis(metadata);
  }
}

function generateHiveIndicators(results: HiveAIResult[], combinedScore: number): DetectionIndicator[] {
  const avgAIScore = results.reduce((sum, r) => sum + r.aiScore, 0) / results.length;
  const avgDeepfakeScore = results.reduce((sum, r) => sum + r.deepfakeScore, 0) / results.length;
  const hasSource = results.some(r => r.source && r.source !== "Not AI-Generated");

  return [
    {
      name: "AI Generation Detection",
      detected: avgAIScore >= 0.5,
      confidence: Math.round(avgAIScore * 100),
      description: `Hive AI detected ${avgAIScore >= 0.5 ? 'likely' : 'unlikely'} AI-generated content across analyzed frames`
    },
    {
      name: "Deepfake Detection",
      detected: avgDeepfakeScore >= 0.5,
      confidence: Math.round(avgDeepfakeScore * 100),
      description: `Face manipulation analysis ${avgDeepfakeScore >= 0.5 ? 'indicates' : 'does not indicate'} deepfake characteristics`
    },
    {
      name: "Source Identification",
      detected: hasSource,
      confidence: hasSource ? Math.round(Math.max(...results.map(r => r.sourceConfidence)) * 100) : 10,
      description: hasSource 
        ? `AI generator source identified: ${results.find(r => r.source)?.source}`
        : "No specific AI generation tool identified"
    },
    {
      name: "Multi-Frame Consistency",
      detected: combinedScore >= 50,
      confidence: Math.round((1 - (Math.abs(Math.max(...results.map(r => r.aiScore)) - Math.min(...results.map(r => r.aiScore))))) * 100),
      description: "Analysis of detection consistency across multiple video frames"
    }
  ];
}

function generateHiveFindings(results: HiveAIResult[], combinedScore: number, source: string | null): Finding[] {
  const findings: Finding[] = [];
  const avgAIScore = results.reduce((sum, r) => sum + r.aiScore, 0) / results.length;
  const avgDeepfakeScore = results.reduce((sum, r) => sum + r.deepfakeScore, 0) / results.length;

  if (combinedScore >= 70) {
    findings.push({
      category: "High AI Detection Confidence",
      description: `Hive AI analysis indicates this video is very likely AI-generated (${combinedScore}% confidence). Multiple frames showed strong synthetic indicators.`,
      severity: "high"
    });
  } else if (combinedScore >= 50) {
    findings.push({
      category: "Moderate AI Detection",
      description: `Analysis suggests this video may contain AI-generated content (${combinedScore}% confidence). Some frames showed potential synthetic characteristics.`,
      severity: "medium"
    });
  } else if (combinedScore >= 30) {
    findings.push({
      category: "Low AI Indicators",
      description: `Minor AI generation indicators detected (${combinedScore}% confidence). The video appears mostly authentic but some elements warrant attention.`,
      severity: "low"
    });
  } else {
    findings.push({
      category: "Likely Authentic",
      description: `This video appears to be authentic (${100 - combinedScore}% confidence). Hive AI did not detect significant indicators of AI generation.`,
      severity: "low"
    });
  }

  if (source) {
    findings.push({
      category: "AI Source Identified",
      description: `The analysis suggests this content was created using ${source}. This identification helps understand how the video was generated.`,
      severity: avgAIScore >= 0.5 ? "medium" : "low"
    });
  }

  if (avgDeepfakeScore >= 0.5) {
    findings.push({
      category: "Deepfake Detected",
      description: `Face manipulation consistent with deepfake techniques was detected (${Math.round(avgDeepfakeScore * 100)}% confidence). Faces in this video may have been synthetically altered.`,
      severity: "high"
    });
  }

  findings.push({
    category: "Detection Method",
    description: "Analysis performed using Hive AI's specialized deepfake and AI content detection models, which are trained on millions of real and synthetic videos.",
    severity: "low"
  });

  return findings;
}

async function analyzeWithGeminiMethod(framePaths: string[], metadata: VideoMetadata): Promise<AnalysisResult> {
  try {
    const frameAnalyses = [];

    for (let i = 0; i < Math.min(framePaths.length, 3); i++) {
      const frameBytes = fs.readFileSync(framePaths[i]);
      const frameBase64 = frameBytes.toString("base64");

      const prompt = `Analyze this video frame for signs of AI generation. Look for synthetic artifacts, unnatural patterns, impossible physics, or other indicators that this is AI-generated content. 

Provide specific observations about what you see.`;

      const response = await ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              data: frameBase64,
              mimeType: "image/jpeg",
            },
          },
          prompt
        ],
      });

      frameAnalyses.push(response.text || "No analysis available");
    }

    const combinedAnalysis = frameAnalyses.join("\n\n");
    
    const aiScore = calculateAIScore(combinedAnalysis, metadata);

    const indicators = generateIndicators(combinedAnalysis, aiScore);
    const findings = generateFindings(combinedAnalysis, aiScore);

    return {
      metadata,
      aiScore,
      detectionIndicators: indicators,
      findings,
      detectionMethod: 'gemini'
    };
  } catch (error) {
    console.error("Gemini analysis error, falling back to heuristic:", error);
    return performHeuristicAnalysis(metadata);
  }
}

function performHeuristicAnalysis(metadata: VideoMetadata): AnalysisResult {
  let aiScore = 45;
  
  if (!metadata.creationTime) aiScore += 10;
  if (!metadata.software) aiScore += 8;
  if (metadata.software?.toLowerCase().includes('unknown')) aiScore += 7;
  if (!metadata.codec) aiScore += 5;
  
  const hasStandardResolution = metadata.width && metadata.height && 
    (metadata.width === 1920 && metadata.height === 1080) ||
    (metadata.width === 1280 && metadata.height === 720) ||
    (metadata.width === 3840 && metadata.height === 2160);
  
  if (!hasStandardResolution && metadata.width && metadata.height) {
    aiScore += 8;
  }

  aiScore = Math.min(100, Math.max(0, aiScore));

  const indicators: DetectionIndicator[] = [
    {
      name: "Metadata Analysis",
      detected: !metadata.creationTime || !metadata.software,
      confidence: (!metadata.creationTime || !metadata.software) ? 65 : 30,
      description: "Analysis of video metadata for typical AI generation patterns"
    },
    {
      name: "Resolution Patterns",
      detected: !hasStandardResolution,
      confidence: !hasStandardResolution ? 55 : 25,
      description: "Evaluation of video resolution characteristics"
    },
    {
      name: "Codec Analysis",
      detected: !metadata.codec || metadata.codec === 'unknown',
      confidence: (!metadata.codec || metadata.codec === 'unknown') ? 50 : 20,
      description: "Inspection of video encoding methods"
    },
    {
      name: "Software Signature",
      detected: !metadata.software || metadata.software.toLowerCase().includes('unknown'),
      confidence: (!metadata.software || metadata.software.toLowerCase().includes('unknown')) ? 60 : 25,
      description: "Detection of creation software indicators"
    }
  ];

  const findings: Finding[] = [];

  if (aiScore > 60) {
    findings.push({
      category: "Metadata Concerns",
      description: "Missing or suspicious metadata fields that may indicate AI generation or manipulation",
      severity: "medium"
    });
  }

  if (!metadata.creationTime) {
    findings.push({
      category: "Missing Creation Time",
      description: "Video lacks creation timestamp, which is unusual for authentic recordings",
      severity: "low"
    });
  }

  if (aiScore < 40) {
    findings.push({
      category: "Likely Authentic",
      description: "Video metadata appears consistent with authentic recordings. No significant AI generation indicators detected.",
      severity: "low"
    });
  }

  findings.push({
    category: "Analysis Method",
    description: "This analysis used heuristic metadata inspection. For enhanced AI-powered frame analysis, configure a Hive AI or Gemini API key.",
    severity: "low"
  });

  return {
    metadata,
    aiScore,
    detectionIndicators: indicators,
    findings,
    detectionMethod: 'heuristic'
  };
}

function calculateAIScore(analysis: string, metadata: VideoMetadata): number {
  let score = 50;
  
  const lowerAnalysis = analysis.toLowerCase();
  
  if (lowerAnalysis.includes('synthetic') || lowerAnalysis.includes('artificial')) score += 15;
  if (lowerAnalysis.includes('unnatural') || lowerAnalysis.includes('impossible')) score += 10;
  if (lowerAnalysis.includes('artifact') || lowerAnalysis.includes('glitch')) score += 10;
  if (lowerAnalysis.includes('inconsistent') || lowerAnalysis.includes('anomaly')) score += 8;
  
  if (lowerAnalysis.includes('realistic') || lowerAnalysis.includes('authentic')) score -= 15;
  if (lowerAnalysis.includes('natural')) score -= 10;
  
  if (!metadata.creationTime) score += 5;
  if (!metadata.software || metadata.software.includes('unknown')) score += 5;
  
  return Math.min(100, Math.max(0, score));
}

function generateIndicators(analysis: string, aiScore: number): DetectionIndicator[] {
  const lowerAnalysis = analysis.toLowerCase();
  
  return [
    {
      name: "Watermark Removal",
      detected: aiScore > 60 && (lowerAnalysis.includes('watermark') || !lowerAnalysis.includes('branding')),
      confidence: aiScore > 60 ? Math.min(85, aiScore) : 15,
      description: "Analysis of typical watermark regions and removal patterns"
    },
    {
      name: "Synthetic Artifacts",
      detected: lowerAnalysis.includes('artifact') || lowerAnalysis.includes('synthetic'),
      confidence: lowerAnalysis.includes('artifact') ? Math.min(90, aiScore + 10) : 20,
      description: "Detection of unnatural textures or visual anomalies common in AI-generated content"
    },
    {
      name: "Temporal Inconsistencies",
      detected: lowerAnalysis.includes('inconsistent') || lowerAnalysis.includes('jump'),
      confidence: lowerAnalysis.includes('inconsistent') ? Math.min(75, aiScore) : 25,
      description: "Analysis of frame-to-frame continuity and temporal coherence"
    },
    {
      name: "Unnatural Motion",
      detected: lowerAnalysis.includes('unnatural') && lowerAnalysis.includes('motion'),
      confidence: lowerAnalysis.includes('motion') ? Math.min(70, aiScore) : 30,
      description: "Evaluation of movement patterns and physics consistency"
    },
    {
      name: "Lighting Anomalies",
      detected: lowerAnalysis.includes('lighting') || lowerAnalysis.includes('shadow'),
      confidence: lowerAnalysis.includes('lighting') ? Math.min(65, aiScore) : 35,
      description: "Inspection of lighting consistency and shadow accuracy"
    }
  ];
}

function generateFindings(analysis: string, aiScore: number): Finding[] {
  const findings: Finding[] = [];
  const lowerAnalysis = analysis.toLowerCase();

  if (aiScore > 70) {
    findings.push({
      category: "High AI Likelihood",
      description: "Multiple indicators suggest this video is likely AI-generated. Consider conducting additional verification.",
      severity: "high"
    });
  }

  if (lowerAnalysis.includes('artifact')) {
    findings.push({
      category: "Visual Artifacts",
      description: "Detected visual artifacts that may indicate AI generation or heavy post-processing.",
      severity: "medium",
      frameTimestamp: 0
    });
  }

  if (lowerAnalysis.includes('inconsistent')) {
    findings.push({
      category: "Temporal Inconsistencies",
      description: "Noted inconsistencies in visual continuity between frames.",
      severity: "medium"
    });
  }

  if (aiScore < 30) {
    findings.push({
      category: "Likely Authentic",
      description: "Video appears to be genuine with natural characteristics and no significant AI generation indicators.",
      severity: "low"
    });
  }

  return findings;
}

export async function generatePlainEnglishSummary(
  result: AnalysisResult,
  filename: string
): Promise<string> {
  const { aiScore, detectionIndicators, findings, metadata, hiveAIResult, detectionMethod, aiSource } = result;
  
  const getVerdict = (score: number): string => {
    if (score >= 80) return "Very Likely AI-Generated";
    if (score >= 60) return "Probably AI-Generated";
    if (score >= 40) return "Uncertain - Could Be Either";
    if (score >= 20) return "Probably Authentic";
    return "Very Likely Authentic";
  };

  const getConfidenceWord = (score: number): string => {
    if (score >= 80) return "high";
    if (score >= 60) return "moderate-to-high";
    if (score >= 40) return "moderate";
    return "low";
  };

  const verdict = getVerdict(aiScore);
  const confidence = getConfidenceWord(aiScore);

  if (detectionMethod === 'hive_ai' && hiveAIResult) {
    return generateHiveAISummary(aiScore, verdict, confidence, hiveAIResult, aiSource);
  }

  if (ai && hasGeminiKey) {
    try {
      const technicalContext = `
Video: ${filename}
AI Score: ${aiScore}/100 (${verdict})
Resolution: ${metadata.width}x${metadata.height}
Duration: ${metadata.duration ? Math.round(metadata.duration) + ' seconds' : 'Unknown'}
Codec: ${metadata.codec || 'Unknown'}

Key Findings:
${findings.map(f => `- ${f.category}: ${f.description} (${f.severity} severity)`).join('\n')}

Detection Indicators:
${detectionIndicators.filter(i => i.detected).map(i => `- ${i.name}: ${i.description} (${i.confidence}% confidence)`).join('\n') || '- No specific AI indicators detected'}
`;

      const prompt = `You are helping explain a video authenticity analysis to a non-technical person. Write a brief, friendly 2-3 paragraph summary that:

1. States the main conclusion clearly in plain language (is this video likely real or AI-made?)
2. Explains the key reasons in simple terms anyone can understand
3. Gives practical advice on what to do with this information

Avoid technical jargon. Use conversational language like you're explaining to a friend.

Here's the technical analysis to summarize:
${technicalContext}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [prompt],
      });

      return response.text || generateFallbackSummary(aiScore, verdict, confidence, findings);
    } catch (error) {
      console.error("Error generating AI summary:", error);
      return generateFallbackSummary(aiScore, verdict, confidence, findings);
    }
  }

  return generateFallbackSummary(aiScore, verdict, confidence, findings);
}

function generateHiveAISummary(
  aiScore: number,
  verdict: string,
  confidence: string,
  hiveResult: HiveAIResult,
  aiSource?: string
): string {
  let summary = "";
  
  if (aiScore >= 70) {
    summary = `This video appears to be AI-generated. Our specialized detection system, which is trained on millions of real and synthetic videos, found strong indicators of artificial creation.`;
    
    if (aiSource) {
      summary += ` The analysis suggests this content was likely created using ${aiSource}.`;
    }
    
    if (hiveResult.isDeepfake) {
      summary += ` Additionally, face manipulation consistent with deepfake techniques was detected.`;
    }
  } else if (aiScore >= 50) {
    summary = `This video shows some characteristics that could indicate AI generation. Our detection system found moderate indicators of synthetic content, but the results are not conclusive.`;
    
    if (aiSource) {
      summary += ` If AI-generated, it may have been created using ${aiSource}.`;
    }
  } else if (aiScore >= 30) {
    summary = `This video appears to be mostly authentic. While our detection system noticed some minor elements that could warrant attention, the overall analysis suggests this is likely real footage rather than AI-generated content.`;
  } else {
    summary = `This video appears to be authentic. Our detection system, which analyzes for AI-generation patterns across multiple frames, did not find significant indicators of synthetic content. The video characteristics are consistent with real camera footage.`;
  }
  
  summary += `\n\nThis analysis was performed using specialized AI detection technology that can identify content from popular generators like Sora, Runway, Midjourney, and many others. `;
  
  if (hiveResult.detectedSources && hiveResult.detectedSources.length > 1) {
    const otherSources = hiveResult.detectedSources.slice(1, 3).map(s => s.name).join(" or ");
    summary += `Other possible creation methods detected include ${otherSources}. `;
  }
  
  summary += `\n\nOur confidence in this assessment is ${confidence}. If this video is important for making decisions, consider verifying with the original source.`;
  
  return summary;
}

function generateFallbackSummary(
  aiScore: number,
  verdict: string,
  confidence: string,
  findings: Finding[]
): string {
  let summary = "";

  if (aiScore >= 70) {
    summary = `This video shows strong signs of being created by AI. Our analysis found several indicators that suggest it wasn't filmed with a real camera, but was instead generated using artificial intelligence tools like Sora, Runway, or similar software.`;
  } else if (aiScore >= 50) {
    summary = `This video shows some characteristics that could indicate AI generation, but we're not certain. It has a mix of natural-looking elements and some potentially synthetic features. We recommend treating this content with healthy skepticism until you can verify its source.`;
  } else if (aiScore >= 30) {
    summary = `This video appears to be mostly authentic, though we did notice a few minor elements that could be worth checking. Overall, the visual characteristics suggest it was likely captured with a real camera rather than generated by AI.`;
  } else {
    summary = `This video appears to be authentic. Our analysis found characteristics consistent with real camera footage, including natural lighting, realistic motion, and typical video metadata. We didn't detect significant signs of AI generation.`;
  }

  const highSeverityFindings = findings.filter(f => f.severity === 'high');
  if (highSeverityFindings.length > 0) {
    summary += `\n\nWe found ${highSeverityFindings.length} significant concern${highSeverityFindings.length > 1 ? 's' : ''} that you should be aware of. `;
  }

  summary += `\n\nOur confidence in this assessment is ${confidence}. If this video is important for making decisions, consider seeking additional verification from the original source or other fact-checking tools.`;

  return summary;
}
