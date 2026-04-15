import { type NextcloudSettings } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

interface NextcloudFile {
  path: string;
  name: string;
  etag: string;
  size: number;
  lastModified: Date;
  contentType: string;
}

interface WebDAVResponse {
  files: NextcloudFile[];
  error?: string;
}

export class NextcloudService {
  private settings: NextcloudSettings;
  private baseUrl: string;

  constructor(settings: NextcloudSettings) {
    this.settings = settings;
    this.baseUrl = settings.serverUrl.replace(/\/$/, "");
  }

  private getAuthHeader(): string {
    const credentials = `${this.settings.username}:${this.settings.appPassword}`;
    return `Basic ${Buffer.from(credentials).toString("base64")}`;
  }

  private getWebDAVUrl(filePath: string = ""): string {
    const normalizedPath = filePath.startsWith("/") ? filePath : `/${filePath}`;
    return `${this.baseUrl}/remote.php/dav/files/${this.settings.username}${normalizedPath}`;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(this.getWebDAVUrl(this.settings.watchFolder), {
        method: "PROPFIND",
        headers: {
          Authorization: this.getAuthHeader(),
          Depth: "0",
          "Content-Type": "application/xml",
        },
        body: `<?xml version="1.0" encoding="UTF-8"?>
          <d:propfind xmlns:d="DAV:">
            <d:prop>
              <d:resourcetype/>
            </d:prop>
          </d:propfind>`,
      });

      if (response.ok || response.status === 207) {
        return { success: true };
      } else if (response.status === 401) {
        return { success: false, error: "Authentication failed. Check username and app password." };
      } else if (response.status === 404) {
        return { success: false, error: `Watch folder "${this.settings.watchFolder}" not found. Please create it first.` };
      } else {
        return { success: false, error: `Connection failed: ${response.statusText}` };
      }
    } catch (error) {
      return { success: false, error: `Network error: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  }

  async listVideoFiles(): Promise<WebDAVResponse> {
    try {
      const response = await fetch(this.getWebDAVUrl(this.settings.watchFolder), {
        method: "PROPFIND",
        headers: {
          Authorization: this.getAuthHeader(),
          Depth: "1",
          "Content-Type": "application/xml",
        },
        body: `<?xml version="1.0" encoding="UTF-8"?>
          <d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
            <d:prop>
              <d:displayname/>
              <d:getcontenttype/>
              <d:getcontentlength/>
              <d:getlastmodified/>
              <d:getetag/>
              <oc:fileid/>
            </d:prop>
          </d:propfind>`,
      });

      if (!response.ok && response.status !== 207) {
        return { files: [], error: `Failed to list files: ${response.statusText}` };
      }

      const xmlText = await response.text();
      const files = this.parseWebDAVResponse(xmlText);
      
      const videoExtensions = [".mp4", ".mov", ".avi", ".webm", ".mkv", ".m4v"];
      const videoFiles = files.filter(file => {
        const ext = path.extname(file.name).toLowerCase();
        return videoExtensions.includes(ext);
      });

      return { files: videoFiles };
    } catch (error) {
      return { files: [], error: `Error listing files: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  }

  private parseWebDAVResponse(xmlText: string): NextcloudFile[] {
    const files: NextcloudFile[] = [];
    
    const responseRegex = /<d:response>([\s\S]*?)<\/d:response>/gi;
    let match;
    
    while ((match = responseRegex.exec(xmlText)) !== null) {
      const responseContent = match[1];
      
      const hrefMatch = /<d:href>([^<]+)<\/d:href>/i.exec(responseContent);
      const displayNameMatch = /<d:displayname>([^<]*)<\/d:displayname>/i.exec(responseContent);
      const contentTypeMatch = /<d:getcontenttype>([^<]*)<\/d:getcontenttype>/i.exec(responseContent);
      const sizeMatch = /<d:getcontentlength>([^<]*)<\/d:getcontentlength>/i.exec(responseContent);
      const lastModifiedMatch = /<d:getlastmodified>([^<]*)<\/d:getlastmodified>/i.exec(responseContent);
      const etagMatch = /<d:getetag>"?([^"<]*)"?<\/d:getetag>/i.exec(responseContent);
      
      if (hrefMatch && displayNameMatch && displayNameMatch[1]) {
        const href = decodeURIComponent(hrefMatch[1]);
        const name = displayNameMatch[1];
        
        if (!responseContent.includes("<d:collection/>") && name) {
          const filePath = href.replace(/^.*\/remote\.php\/dav\/files\/[^/]+/, "");
          
          files.push({
            path: filePath,
            name,
            etag: etagMatch ? etagMatch[1] : "",
            size: sizeMatch ? parseInt(sizeMatch[1], 10) : 0,
            lastModified: lastModifiedMatch ? new Date(lastModifiedMatch[1]) : new Date(),
            contentType: contentTypeMatch ? contentTypeMatch[1] : "application/octet-stream",
          });
        }
      }
    }
    
    return files;
  }

  async downloadFile(filePath: string, localPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(this.getWebDAVUrl(filePath), {
        method: "GET",
        headers: {
          Authorization: this.getAuthHeader(),
        },
      });

      if (!response.ok) {
        return { success: false, error: `Failed to download file: ${response.statusText}` };
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(localPath, buffer);
      return { success: true };
    } catch (error) {
      return { success: false, error: `Error downloading file: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  }

  async moveFile(sourcePath: string, destPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(this.getWebDAVUrl(sourcePath), {
        method: "MOVE",
        headers: {
          Authorization: this.getAuthHeader(),
          Destination: this.getWebDAVUrl(destPath),
          Overwrite: "T",
        },
      });

      if (response.ok || response.status === 201 || response.status === 204) {
        return { success: true };
      } else {
        return { success: false, error: `Failed to move file: ${response.statusText}` };
      }
    } catch (error) {
      return { success: false, error: `Error moving file: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  }

  async createFolder(folderPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(this.getWebDAVUrl(folderPath), {
        method: "MKCOL",
        headers: {
          Authorization: this.getAuthHeader(),
        },
      });

      if (response.ok || response.status === 201 || response.status === 405) {
        return { success: true };
      } else {
        return { success: false, error: `Failed to create folder: ${response.statusText}` };
      }
    } catch (error) {
      return { success: false, error: `Error creating folder: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  }

  static generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  static verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

export function createNextcloudService(settings: NextcloudSettings): NextcloudService {
  return new NextcloudService(settings);
}
