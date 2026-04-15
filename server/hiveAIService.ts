import * as fs from "fs";
import * as path from "path";

const HIVE_API_KEY = process.env.HIVE_API_KEY;
const HIVE_API_URL = "https://api.thehive.ai/api/v2/task/sync";

export interface HiveAIResult {
  isAIGenerated: boolean;
  aiScore: number;
  isDeepfake: boolean;
  deepfakeScore: number;
  source: string | null;
  sourceConfidence: number;
  rawResponse: any;
  detectedSources: { name: string; confidence: number }[];
}

export interface HiveDetectionResult {
  success: boolean;
  result?: HiveAIResult;
  error?: string;
}

const AI_GENERATORS = [
  "sora", "sora2", "pika", "haiper", "kling", "luma", "hedra", "runway", 
  "hailuo", "mochi", "flux", "hallo", "hunyuan", "recraft", "leonardo", 
  "luminagpt", "var", "liveportrait", "mcnet", "pyramidflows", "sadtalker", 
  "aniportrait", "cogvideos", "makeittalk", "sdxlinpaint", "stablediffusioninpaint", 
  "bingimagecreator", "adobefirefly", "lcm", "dalle", "pixart", "glide", 
  "stablediffusion", "imagen", "amused", "stablecascade", "midjourney", 
  "deepfloyd", "gan", "stablediffusionxl", "vqdiffusion", "kandinsky", 
  "wuerstchen", "titan", "ideogram", "sana", "emu3", "omnigen", "flashvideo", 
  "transpixar", "cosmos", "janus", "dmd2", "switti", "4o", "grok", "wan", 
  "infinity", "veo3", "imagen4", "krea", "moonvalley", "higgsfield", "gemini", 
  "reve", "heygen", "seedream", "seedance", "grokimagine", "gemini3",
  "other_image_generators"
];

function formatSourceName(source: string): string {
  const sourceMap: Record<string, string> = {
    "sora": "OpenAI Sora",
    "sora2": "OpenAI Sora 2",
    "dalle": "DALL-E",
    "midjourney": "Midjourney",
    "stablediffusion": "Stable Diffusion",
    "stablediffusionxl": "Stable Diffusion XL",
    "runway": "Runway",
    "pika": "Pika Labs",
    "kling": "Kling AI",
    "luma": "Luma AI",
    "adobefirefly": "Adobe Firefly",
    "flux": "Flux",
    "gemini": "Google Gemini",
    "gemini3": "Google Gemini 3",
    "veo3": "Google Veo 3",
    "imagen": "Google Imagen",
    "imagen4": "Google Imagen 4",
    "hedra": "Hedra",
    "hailuo": "Hailuo AI",
    "hunyuan": "Tencent Hunyuan",
    "heygen": "HeyGen",
    "grok": "xAI Grok",
    "grokimagine": "xAI Grok Imagine",
    "ideogram": "Ideogram",
    "leonardo": "Leonardo AI",
    "recraft": "Recraft",
    "cosmos": "NVIDIA Cosmos",
    "gan": "GAN-based",
    "other_image_generators": "Unknown AI Generator",
    "inconclusive": "Inconclusive",
    "inconclusive_video": "Inconclusive (Video)",
    "none": "Not AI-Generated"
  };
  
  return sourceMap[source.toLowerCase()] || source.charAt(0).toUpperCase() + source.slice(1);
}

export async function analyzeWithHiveAI(videoPath: string): Promise<HiveDetectionResult> {
  if (!HIVE_API_KEY) {
    console.log("[Hive AI] API key not configured");
    return { success: false, error: "Hive AI API key not configured" };
  }

  try {
    console.log(`[Hive AI] Analyzing video: ${videoPath}`);
    
    const videoBuffer = fs.readFileSync(videoPath);
    const filename = path.basename(videoPath);
    
    const formData = new FormData();
    const blob = new Blob([videoBuffer], { type: 'video/mp4' });
    formData.append('media', blob, filename);

    const response = await fetch(HIVE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${HIVE_API_KEY}`,
        'Accept': 'application/json'
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Hive AI] API error: ${response.status} - ${errorText}`);
      return { 
        success: false, 
        error: `Hive AI API error: ${response.status} ${response.statusText}` 
      };
    }

    const data = await response.json();
    console.log(`[Hive AI] Response received:`, JSON.stringify(data, null, 2));

    const result = parseHiveResponse(data);
    return { success: true, result };

  } catch (error) {
    console.error("[Hive AI] Analysis error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error during Hive AI analysis" 
    };
  }
}

export async function analyzeFrameWithHiveAI(framePath: string): Promise<HiveDetectionResult> {
  if (!HIVE_API_KEY) {
    console.log("[Hive AI] API key not configured");
    return { success: false, error: "Hive AI API key not configured" };
  }

  try {
    console.log(`[Hive AI] Analyzing frame: ${framePath}`);
    
    const imageBuffer = fs.readFileSync(framePath);
    const filename = path.basename(framePath);
    
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('media', blob, filename);

    const response = await fetch(HIVE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${HIVE_API_KEY}`,
        'Accept': 'application/json'
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Hive AI] API error: ${response.status} - ${errorText}`);
      return { 
        success: false, 
        error: `Hive AI API error: ${response.status} ${response.statusText}` 
      };
    }

    const data = await response.json();
    console.log(`[Hive AI] Frame analysis response received`);

    const result = parseHiveResponse(data);
    return { success: true, result };

  } catch (error) {
    console.error("[Hive AI] Frame analysis error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error during Hive AI frame analysis" 
    };
  }
}

function parseHiveResponse(data: any): HiveAIResult {
  let aiGeneratedScore = 0;
  let notAIGeneratedScore = 0;
  let deepfakeScore = 0;
  let detectedSource: string | null = null;
  let sourceConfidence = 0;
  const detectedSources: { name: string; confidence: number }[] = [];

  try {
    const output = data?.status?.response?.output || [];
    
    for (const item of output) {
      const classes = item?.classes || [];
      
      for (const cls of classes) {
        const className = cls.class?.toLowerCase() || "";
        const score = cls.score || 0;

        if (className === "ai_generated") {
          aiGeneratedScore = Math.max(aiGeneratedScore, score);
        } else if (className === "not_ai_generated") {
          notAIGeneratedScore = Math.max(notAIGeneratedScore, score);
        } else if (className === "deepfake" || className === "yes_deepfake") {
          deepfakeScore = Math.max(deepfakeScore, score);
        } else if (AI_GENERATORS.includes(className) && score > 0.1) {
          detectedSources.push({ 
            name: formatSourceName(className), 
            confidence: score 
          });
          if (score > sourceConfidence) {
            detectedSource = formatSourceName(className);
            sourceConfidence = score;
          }
        }
      }
    }

    detectedSources.sort((a, b) => b.confidence - a.confidence);

  } catch (error) {
    console.error("[Hive AI] Error parsing response:", error);
  }

  const combinedScore = Math.max(aiGeneratedScore, deepfakeScore);
  const isAIGenerated = aiGeneratedScore >= 0.5;
  const isDeepfake = deepfakeScore >= 0.5;

  return {
    isAIGenerated,
    aiScore: aiGeneratedScore,
    isDeepfake,
    deepfakeScore,
    source: detectedSource,
    sourceConfidence,
    rawResponse: data,
    detectedSources: detectedSources.slice(0, 5)
  };
}

export function isHiveAIConfigured(): boolean {
  return !!HIVE_API_KEY;
}

export function generateHiveSummary(result: HiveAIResult): string {
  const aiPercentage = Math.round(result.aiScore * 100);
  const deepfakePercentage = Math.round(result.deepfakeScore * 100);
  
  let summary = "";
  
  if (result.isAIGenerated || result.isDeepfake) {
    if (result.isAIGenerated && result.isDeepfake) {
      summary = `This video shows strong indicators of being AI-generated content with deepfake elements. `;
    } else if (result.isAIGenerated) {
      summary = `This video appears to be AI-generated content. `;
    } else {
      summary = `This video shows signs of deepfake manipulation. `;
    }
    
    if (result.source && result.source !== "Not AI-Generated" && result.source !== "Inconclusive") {
      summary += `The analysis suggests it was likely created using ${result.source} (${Math.round(result.sourceConfidence * 100)}% confidence). `;
    }
    
    summary += `\n\nThe AI generation confidence is ${aiPercentage}%`;
    if (result.isDeepfake) {
      summary += ` and deepfake detection confidence is ${deepfakePercentage}%`;
    }
    summary += `.`;
    
  } else if (aiPercentage >= 30 || deepfakePercentage >= 30) {
    summary = `This video shows some characteristics that could indicate AI involvement, but the evidence is not conclusive. `;
    summary += `The AI generation score is ${aiPercentage}% and deepfake score is ${deepfakePercentage}%. `;
    summary += `This could be a heavily edited video or contain some AI-enhanced elements.`;
    
  } else {
    summary = `This video appears to be authentic and not AI-generated. `;
    summary += `The analysis found no significant indicators of AI generation (${aiPercentage}%) or deepfake manipulation (${deepfakePercentage}%). `;
    summary += `The video likely shows real footage without substantial AI alteration.`;
  }
  
  if (result.detectedSources.length > 1) {
    const otherSources = result.detectedSources
      .slice(1, 4)
      .map(s => `${s.name} (${Math.round(s.confidence * 100)}%)`)
      .join(", ");
    summary += `\n\nOther possible sources detected: ${otherSources}`;
  }
  
  return summary;
}
