import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = "damianrocks@protonmail.com";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.log("[Email Service] SENDGRID_API_KEY not set - email notifications will be disabled");
}

export interface AnalysisEmailData {
  filename: string;
  aiScore: number;
  plainSummary: string;
  analysisId: string;
  analysisUrl: string;
}

function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, char => htmlEntities[char] || char);
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

function getVerdictColor(score: number): string {
  if (score >= 70) return "#dc2626";
  if (score >= 50) return "#f59e0b";
  if (score >= 30) return "#eab308";
  return "#22c55e";
}

function getVerdictLabel(score: number): string {
  if (score >= 80) return "Very Likely AI-Generated";
  if (score >= 60) return "Probably AI-Generated";
  if (score >= 40) return "Uncertain";
  if (score >= 20) return "Probably Authentic";
  return "Very Likely Authentic";
}

function getVerdictStatusText(score: number): string {
  if (score >= 60) return "ALERT";
  if (score >= 40) return "UNCERTAIN";
  return "VERIFIED";
}

function generateEmailHTML(data: AnalysisEmailData): string {
  const verdictColor = getVerdictColor(data.aiScore);
  const verdictLabel = escapeHtml(getVerdictLabel(data.aiScore));
  const verdictStatus = getVerdictStatusText(data.aiScore);
  const escapedFilename = escapeHtml(data.filename);
  const escapedUrl = escapeHtml(data.analysisUrl);
  
  const summaryParagraphs = data.plainSummary.split('\n\n').map(p => 
    `<p style="margin: 0 0 16px 0; line-height: 1.6;">${escapeHtml(p)}</p>`
  ).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Video Analysis Complete</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #217abf 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                AI Video Detective
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">
                Your video analysis is complete
              </p>
            </td>
          </tr>
          
          <!-- Verdict Section -->
          <tr>
            <td style="padding: 32px 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <div style="display: inline-block; background-color: ${verdictColor}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 700; letter-spacing: 1px; margin-bottom: 12px;">
                      ${verdictStatus}
                    </div>
                    <div style="font-size: 56px; font-weight: 700; color: ${verdictColor}; margin-bottom: 4px;">
                      ${data.aiScore}%
                    </div>
                    <div style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                      AI Generation Likelihood
                    </div>
                    <div style="display: inline-block; background-color: ${verdictColor}; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                      ${verdictLabel}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Video Info -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; border-radius: 8px; padding: 16px;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Analyzed Video</p>
                    <p style="margin: 4px 0 0 0; font-size: 16px; color: #1e293b; font-weight: 500; word-break: break-all;">${escapedFilename}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Summary Section -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1e293b; font-weight: 600;">
                What We Found
              </h2>
              <div style="color: #475569; font-size: 15px;">
                ${summaryParagraphs}
              </div>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 32px; text-align: center;">
              <a href="${escapedUrl}" style="display: inline-block; background: linear-gradient(135deg, #217abf 0%, #1e5a8a 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                View Full Report
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 13px; color: #64748b; text-align: center;">
                This analysis was performed by AI Video Detective. Results are for informational purposes only and should not be used as definitive proof.
              </p>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #94a3b8; text-align: center;">
                AI Video Detective. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function generatePlainTextEmail(data: AnalysisEmailData): string {
  const verdictLabel = getVerdictLabel(data.aiScore);
  
  return `
AI Video Detective - Analysis Complete

Video: ${data.filename}
AI Score: ${data.aiScore}% - ${verdictLabel}

WHAT WE FOUND
-------------
${data.plainSummary}

View the full report: ${data.analysisUrl}

---
This analysis was performed by AI Video Detective. Results are for informational purposes only.
© 2025 AI Video Detective
`;
}

export async function sendAnalysisEmail(
  toEmail: string,
  data: AnalysisEmailData
): Promise<{ success: boolean; error?: string }> {
  if (!SENDGRID_API_KEY) {
    console.log("[Email Service] SendGrid API key not configured - email notification skipped");
    return { success: false, error: "Email service not configured" };
  }

  if (!isValidEmail(toEmail)) {
    console.warn(`[Email Service] Invalid email address format: ${toEmail.substring(0, 20)}...`);
    return { success: false, error: "Invalid email address format" };
  }

  try {
    const verdictLabel = getVerdictLabel(data.aiScore);
    const safeFilename = data.filename.length > 100 ? data.filename.substring(0, 100) + '...' : data.filename;
    
    const msg = {
      to: toEmail,
      from: {
        email: FROM_EMAIL,
        name: "AI Video Detective"
      },
      subject: `Video Analysis: ${safeFilename} - ${verdictLabel}`,
      text: generatePlainTextEmail(data),
      html: generateEmailHTML(data),
    };

    await sgMail.send(msg);
    console.log(`[Email Service] Analysis email sent to ${toEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error("[Email Service] Failed to send email:", error);
    return { 
      success: false, 
      error: error.response?.body?.errors?.[0]?.message || error.message || "Failed to send email"
    };
  }
}

export function isEmailConfigured(): boolean {
  return !!SENDGRID_API_KEY;
}

export { isValidEmail };
