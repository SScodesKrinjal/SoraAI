# AI Video Detection Platform - Design Guidelines

## Design Approach

**Selected Approach:** Design System with SaaS Tool Inspiration

Drawing from professional analysis tools like Linear, Vercel, and modern security platforms, this design prioritizes clarity, trust, and professional credibility. The interface must communicate technical sophistication while remaining accessible to non-technical users.

**Core Principles:**
1. **Clarity First:** Detection results must be immediately understandable
2. **Trust Through Transparency:** Show how analysis works, not just results
3. **Progressive Disclosure:** Complex data available without overwhelming initial view
4. **Professional Precision:** Clean, technical aesthetic that builds confidence

---

## Typography System

**Font Families:**
- Primary: Inter (via Google Fonts) - used for UI, body text, and data
- Accent: JetBrains Mono (via Google Fonts) - used for metadata, technical details, file names

**Type Scale:**
- Hero/Landing Headline: text-5xl md:text-6xl, font-bold, leading-tight
- Section Headers: text-3xl md:text-4xl, font-semibold
- Subsection Headers: text-xl md:text-2xl, font-semibold
- Card Titles: text-lg font-semibold
- Body Text: text-base, leading-relaxed
- Metadata/Technical: text-sm font-mono (JetBrains Mono)
- Labels/Captions: text-sm font-medium
- Microcopy: text-xs

---

## Layout System

**Spacing Primitives:**
Primary spacing units: 4, 6, 8, 12, 16, 24 (as in p-4, gap-6, mt-8, py-12, mb-16, space-y-24)

**Container Strategy:**
- Full-width sections: w-full with max-w-7xl mx-auto px-6
- Content containers: max-w-6xl mx-auto
- Form containers: max-w-2xl mx-auto
- Reading content: max-w-prose

**Grid Patterns:**
- Analysis dashboard: 12-column grid (grid-cols-12)
- Metadata cards: 2-column on desktop (md:grid-cols-2), single on mobile
- Feature showcase: 3-column on desktop (lg:grid-cols-3), 2 on tablet (md:grid-cols-2)

---

## Component Library

### Landing Page Structure

**Hero Section (80vh minimum):**
- Full-width container with gradient overlay
- Hero image: Abstract visualization of AI/video analysis (neural networks, data streams, video frames being analyzed)
- Centered content with max-w-4xl
- Headline emphasizing "Combat AI-Generated Video Fraud"
- Subheadline explaining Sora 2 watermark removal detection
- Primary CTA: "Upload Video for Analysis" (large, prominent)
- Secondary CTA: "See How It Works"
- Trust indicator below CTAs: "Powered by Advanced AI Vision Models"
- Buttons on hero image must have backdrop-blur-md with bg-white/10 or bg-black/20

**Features Grid (3-column):**
- Icon + Title + Description cards with subtle borders
- Features: Metadata Analysis, Visual Inspection, Confidence Scoring, Detailed Reports
- Each card: p-8 with hover:shadow-lg transition
- Icons from Heroicons (shield-check, eye, chart-bar, document-text)

**How It Works Section:**
- Timeline/step visualization (numbered steps 1-4)
- Steps: Upload → Extract Metadata → Analyze Frames → Generate Report
- Each step with icon, title, and brief description
- Vertical on mobile, horizontal on desktop with connecting lines

**Trust Section (2-column):**
- Left: Technical capabilities list with checkmarks
- Right: Sample analysis visualization or screenshot
- Background: subtle gradient or pattern

**CTA Section:**
- Full-width with background treatment
- Centered max-w-3xl content
- Headline: "Ready to Detect AI-Generated Videos?"
- Upload button + alternative: "View Sample Analysis"

**Footer:**
- 3-column layout: About/Links, Resources, Contact
- Newsletter signup with inline form
- Social links, privacy policy, terms
- Copyright and technical credits

### Application Interface

**Upload Interface:**
- Drag-and-drop zone: Large, centered, min-h-96 with dashed border
- Visual feedback states: default, dragover, uploading, error
- File requirements clearly stated: formats (MP4, MOV, AVI), max size
- Icon: cloud-arrow-up from Heroicons
- Progress indicator during upload with percentage

**Analysis Dashboard Layout:**
- Sidebar navigation (left, 240px wide, fixed)
  - Logo at top
  - Navigation items: Dashboard, History, Settings
  - Active state with left border accent
  
- Main content area (flexible width with padding)
  - Breadcrumb navigation at top
  - Page title with status badge
  - Grid layout for analysis components

**Video Preview Component:**
- Card with video player (aspect-ratio-video)
- Playback controls (play/pause, timeline scrubber, volume)
- Frame extraction indicator showing sampled frames
- Thumbnail strip below player showing analyzed frames

**Metadata Display Panel:**
- Table layout with two columns: Property | Value
- Monospace font for technical values
- Properties: File name, Duration, Resolution, Codec, Creation date, Software, Bitrate
- Expandable sections for advanced metadata
- Copy-to-clipboard buttons for each value

**Analysis Results Component:**
- Prominent confidence score display
  - Large circular progress indicator (using SVG)
  - Percentage with context label: "AI Generation Likelihood"
  - Range indicators: 0-30% (Likely Authentic), 30-70% (Inconclusive), 70-100% (Likely AI-Generated)
  
- Detection indicators grid (2-column):
  - Each indicator: icon, label, status (detected/not detected), confidence sub-score
  - Indicators: Watermark Removal, Synthetic Artifacts, Temporal Inconsistencies, Unnatural Motion, Lighting Anomalies

**Detailed Findings Section:**
- Accordion/expandable sections for each analysis category
- Visual annotations: frame thumbnails with highlighted areas of concern
- Technical explanations in plain language
- Timestamp references linking to specific video moments

**Action Buttons:**
- Primary: Download Full Report (PDF)
- Secondary: Share Results, Analyze Another Video
- Tertiary: View Technical Details

**History/Archive View:**
- Table with sortable columns: Filename, Upload Date, Result, Confidence Score
- Filters: Date range, result type (AI/Authentic/Inconclusive)
- Pagination controls
- Quick actions: View Details, Re-analyze, Delete

### Form Elements

**Input Fields:**
- Labels: text-sm font-medium mb-2
- Inputs: px-4 py-3 with border, rounded-lg
- Focus state: ring-2 with offset
- Error state: border-red-500 with error message below

**Buttons:**
- Primary: Large (px-8 py-4), rounded-lg, font-semibold
- Secondary: Same size, border variant
- Small actions: px-4 py-2, text-sm
- Icon buttons: Square (p-3), rounded

**Status Badges:**
- Pill-shaped (rounded-full px-3 py-1)
- Variants: Success (green), Warning (yellow), Danger (red), Neutral (gray)
- Used for analysis results, file status, system messages

### Data Visualization

**Progress Indicators:**
- Circular progress for confidence scores (SVG-based, 200x200px)
- Linear progress bars for upload/processing (h-2 rounded-full)
- Animated during processing

**Charts (if needed):**
- Simple bar charts for frame-by-frame analysis
- Line charts for temporal consistency metrics
- Use inline SVG or Chart.js via CDN

---

## Animations

**Essential Only:**
- Upload zone pulse on dragover
- Smooth transitions for expandable sections (300ms ease)
- Fade-in for analysis results (500ms delay after load)
- Progress indicator rotations
- No scroll-triggered animations, no complex parallax

---

## Images

**Hero Image:**
- Abstract, high-tech visualization suggesting AI/neural network analysis
- Suggestions: Flowing data streams, abstract video frame grid with overlaid analytics, neural network visualization with video elements
- Placement: Full-width hero background with gradient overlay
- Treatment: Subtle motion blur or depth of field for modern aesthetic

**Feature Section Images:**
- Small icons/illustrations for each detection method
- Screenshot showing sample analysis results (can be mockup)

**Analysis Interface:**
- Video thumbnail previews
- Frame extraction thumbnails (actual frames from uploaded video)
- No decorative images in dashboard - focus on functional imagery

---

## Accessibility

- All interactive elements have visible focus states with ring-2 offset
- Form inputs paired with labels (htmlFor)
- Status messages use role="status" or role="alert"
- Video player includes keyboard controls and captions support
- Sufficient contrast ratios throughout (WCAG AA minimum)
- Skip navigation links for dashboard
- Screen reader announcements for analysis progress