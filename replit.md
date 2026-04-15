# AI Video Detective

## Overview
AI Video Detective is an advanced platform for detecting AI-generated videos, including content from tools like Sora 2 with watermarks removed. The application analyzes videos through metadata extraction and AI-powered visual inspection using specialized detection technology.

## Architecture
- **Frontend**: React + TypeScript with Tailwind CSS and Shadcn UI components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for persistent storage
- **AI Detection**: Hive AI (primary, DoD-validated) with Gemini and heuristic fallbacks
- **Video Processing**: FFmpeg for metadata extraction and frame extraction
- **File Upload**: Replit Object Storage for video file handling

## Key Features
1. **Video Upload**: 
   - Drag-and-drop interface for uploading videos (MP4, MOV, AVI, WebM)
   - **URL Paste**: Analyze videos directly from URLs (with SSRF protection)
2. **Nextcloud Integration**: 
   - Connect to Nextcloud server for automated mobile video analysis
   - Share videos from apps like TikTok to a watched folder
   - Automatic polling and webhook support for new file detection
   - Email notifications with analysis results
3. **Metadata Analysis**: Extraction of codec, bitrate, resolution, creation time, software metadata
4. **AI Detection (Hive AI)**: Specialized detection trained on 40+ AI generators including:
   - Sora/Sora 2, Runway, Pika Labs, Kling AI, Luma AI
   - DALL-E, Midjourney, Stable Diffusion, Adobe Firefly
   - Deepfake detection with face manipulation analysis
5. **Source Identification**: Identifies the specific AI generator used (e.g., "OpenAI Sora 2", "Runway")
6. **Deepfake Detection**: Specialized face manipulation detection with confidence scoring
7. **Confidence Scoring**: 0-100% AI generation likelihood score
8. **Detailed Findings**: Expandable sections with technical explanations
9. **Database Persistence**: All analyses stored in PostgreSQL and persist across restarts
10. **Downloadable Reports**: Export analysis results as formatted JSON reports
11. **Analysis History**: Browse all past analyses with search/filter functionality
12. **Social Sharing**: Share analysis results on Twitter, Facebook, LinkedIn, WhatsApp
13. **Professional UI**: Clean, modern interface following SaaS design patterns

## Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   │   ├── video-uploader.tsx
│   │   │   ├── video-analysis-results.tsx
│   │   │   ├── circular-progress.tsx
│   │   │   └── ui/        # Shadcn components
│   │   ├── pages/         # Route pages
│   │   │   ├── landing.tsx
│   │   │   ├── analyze.tsx
│   │   │   ├── history.tsx
│   │   │   └── nextcloud-settings.tsx  # Nextcloud integration settings
│   │   └── lib/           # Client utilities
├── server/                # Express backend
│   ├── routes.ts         # API endpoints
│   ├── db.ts            # Database connection
│   ├── storage.ts        # Data storage interface (DbStorage)
│   ├── objectStorage.ts  # Object storage service
│   ├── videoAnalyzer.ts  # Video analysis logic
│   ├── nextcloudService.ts  # Nextcloud WebDAV client
│   └── nextcloudWorker.ts   # Nextcloud polling and job processing
└── shared/
    └── schema.ts         # TypeScript types and schemas
```

## API Endpoints
- `POST /api/analyze-video` - Upload and analyze video file
- `POST /api/analyze-video-url` - Analyze video from URL (with SSRF protection)
- `GET /api/analyses` - Get all video analyses (ordered by date)
- `GET /api/analyses/:id` - Get specific analysis by ID
- `GET /api/analyses/:id/download` - Download analysis report as JSON
- `GET /objects/:objectPath` - Retrieve uploaded video files from object storage
- `GET /temp/:filename` - Retrieve video files from temp directory

### Nextcloud Integration Endpoints
- `GET /api/nextcloud/settings` - Get all Nextcloud configurations (passwords redacted)
- `GET /api/nextcloud/settings/:id` - Get specific Nextcloud settings
- `POST /api/nextcloud/settings` - Create new Nextcloud connection
- `PUT /api/nextcloud/settings/:id` - Update Nextcloud settings
- `DELETE /api/nextcloud/settings/:id` - Remove Nextcloud connection
- `POST /api/nextcloud/settings/:id/test` - Test Nextcloud connection
- `POST /api/nextcloud/webhook/:settingsId` - Webhook endpoint for Nextcloud file notifications
- `GET /api/nextcloud/status` - Get polling status and queue information

## Environment Variables
- `DATABASE_URL` - PostgreSQL database connection string (required)
- `HIVE_API_KEY` - Hive AI API key for specialized AI detection (recommended - most accurate)
- `GEMINI_API_KEY` - Google Gemini API key for AI analysis (fallback if Hive AI unavailable)
- `SENDGRID_API_KEY` - SendGrid API key for email notifications (optional)
- `PUBLIC_OBJECT_SEARCH_PATHS` - Object storage paths for public files
- `PRIVATE_OBJECT_DIR` - Object storage directory for private uploads

## Design System
- **Colors**: Professional blue primary (#217ABF), with green/yellow/red for status indicators
- **Typography**: Inter for UI, JetBrains Mono for technical/metadata display
- **Spacing**: Consistent 4/6/8/12/16/24px spacing units
- **Components**: Shadcn UI with custom theming

## Recent Changes
- 2025-12-07: Added Nextcloud Integration for mobile video sharing workflow
  - Created nextcloudService.ts module for WebDAV file access and download
  - Added nextcloudWorker.ts for polling and job queue processing
  - Database schema updated with nextcloudSettings and processedFiles tables
  - Built settings page at /nextcloud for managing connections
  - Automatic video detection via polling (60-second intervals) or webhook
  - Videos analyzed through existing Hive AI pipeline with email notification
  - Processed files archived to processed/ subfolder
  - Added navigation link to Nextcloud settings from landing page header
- 2025-12-05: Integrated Hive AI for specialized AI video detection
  - Added hiveAIService.ts module with DoD-validated detection API integration
  - Hive AI analyzes video frames for AI generation across 40+ generator types
  - Detects specific AI sources (Sora 2, Runway, Pika, Midjourney, etc.)
  - Added deepfake detection with face manipulation scoring
  - Detection method fallback chain: Hive AI → Gemini → Heuristic
  - Updated database schema with detectionMethod, aiSource, deepfakeScore, hiveAIResult fields
  - Frontend displays detected AI source and deepfake warnings when applicable
  - Analysis summary shows detection method used (Hive AI, Gemini Vision, or Heuristic)
- 2025-12-05: Enhanced explainability and email notification features
  - Added `plainSummary` field for AI-generated plain-English explanations of analysis results
  - Added `userEmail` field for optional email notifications
  - Created email service module using SendGrid for sending analysis completion notifications
  - Redesigned video analysis results UI with prominent "What This Means" summary section
  - Added collapsible "Technical Details" section for expert users
  - Added color-coded verdict badges (green/yellow/red) for quick visual assessment
  - Added email notification option to both file upload and URL paste interfaces
  - Security improvements: HTML escaping in email templates, email format validation, input sanitization
- 2025-11-06: Added URL paste feature with SSRF protection
  - Users can now paste video URLs directly instead of only uploading files
  - Implemented security measures: protocol validation, private IP blocking, DNS resolution checks, timeout limits
  - Note: For production use with untrusted URLs, consider additional security hardening
- 2025-11-06: Added social media sharing (Twitter, Facebook, LinkedIn, WhatsApp)
- 2025-11-06: Added "Copy Video Link" button for easy video URL sharing
- 2025-10-30: Database persistence with PostgreSQL and Drizzle ORM
- Added downloadable JSON reports for all analyses
- Built history page with search and filter functionality
- Implemented heuristic fallback for Gemini AI analysis
- Added security fix for path traversal vulnerability in temp file serving
- Enhanced navigation with history viewing and analysis detail pages

## User Preferences
- Professional, clean aesthetic preferred
- Focus on trust and transparency in results
- Technical accuracy balanced with user-friendly explanations

## Security Considerations

### URL Analysis Feature
The URL paste feature includes multiple layers of SSRF (Server-Side Request Forgery) protection:
- Protocol validation (HTTP/HTTPS only)
- Private IP range blocking (IPv4 and IPv6)
- DNS resolution validation
- No automatic redirects allowed
- 60-second timeout
- 500MB size limit

**Important Notes:**
- This feature is designed for analyzing publicly accessible video URLs
- For production deployments handling untrusted URLs, consider:
  - Additional network-level restrictions (firewall rules, egress filtering)
  - Running the URL fetch service in an isolated network environment
  - Using a dedicated proxy service for external URL validation
- The current implementation provides good protection for typical use cases but may not defend against all advanced SSRF attack vectors
