import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  AlertTriangle, 
  CheckCircle, 
  AlertCircle,
  Upload,
  Clock,
  Monitor,
  Film,
  Code,
  Calendar,
  HardDrive,
  Activity,
  Zap,
  Eye,
  Target,
  Download,
  Share2,
  Link as LinkIcon,
  Check,
  ChevronDown,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  MessageCircle,
  Sparkles,
  Bot,
  UserX
} from "lucide-react";
import { FaTwitter, FaFacebook, FaLinkedin, FaWhatsapp } from "react-icons/fa";
import type { VideoAnalysis } from "@shared/schema";
import { CircularProgress } from "@/components/circular-progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface VideoAnalysisResultsProps {
  analysis: VideoAnalysis;
  onNewAnalysis: () => void;
}

export function VideoAnalysisResults({ analysis, onNewAnalysis }: VideoAnalysisResultsProps) {
  const [copied, setCopied] = useState(false);
  const [videoCopied, setVideoCopied] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const { toast } = useToast();
  const aiScore = analysis.aiScore || 0;
  
  const getScoreLabel = (score: number) => {
    if (score < 30) return { 
      label: "Likely Authentic", 
      variant: "default" as const, 
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      borderColor: "border-green-200 dark:border-green-800",
      Icon: ShieldCheck
    };
    if (score < 70) return { 
      label: "Uncertain", 
      variant: "secondary" as const, 
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
      borderColor: "border-yellow-200 dark:border-yellow-800",
      Icon: ShieldQuestion
    };
    return { 
      label: "Likely AI-Generated", 
      variant: "destructive" as const, 
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950/30",
      borderColor: "border-red-200 dark:border-red-800",
      Icon: ShieldAlert
    };
  };

  const scoreInfo = getScoreLabel(aiScore);

  // Generate shareable URLs
  const shareUrl = `${window.location.origin}/analyze?id=${analysis.id}`;
  const videoUrl = `${window.location.origin}${analysis.videoPath}`;
  const shareText = `Check out this AI video analysis: ${analysis.filename} - ${scoreInfo.label} (${aiScore}% confidence)`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "The analysis link has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const handleCopyVideoLink = async () => {
    try {
      await navigator.clipboard.writeText(videoUrl);
      setVideoCopied(true);
      toast({
        title: "Video link copied!",
        description: "The video URL has been copied to your clipboard.",
      });
      setTimeout(() => setVideoCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the video link manually.",
        variant: "destructive",
      });
    }
  };

  const handleShare = (platform: string) => {
    let url = '';
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);

    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        break;
    }

    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
    }
  };

  const VerdictIcon = scoreInfo.Icon;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Analysis Results</h2>
          <p className="text-sm text-muted-foreground font-mono" data-testid="text-analysis-filename">
            {analysis.filename}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button 
            variant="outline" 
            onClick={handleCopyVideoLink}
            data-testid="button-copy-video-link"
          >
            {videoCopied ? <Check className="w-4 h-4 mr-2" /> : <LinkIcon className="w-4 h-4 mr-2" />}
            {videoCopied ? "Video Link Copied!" : "Copy Video Link"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-share">
                <Share2 className="w-4 h-4 mr-2" />
                Share Analysis
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleShare('twitter')} data-testid="share-twitter">
                <FaTwitter className="w-4 h-4 mr-2" />
                Share on Twitter
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('facebook')} data-testid="share-facebook">
                <FaFacebook className="w-4 h-4 mr-2" />
                Share on Facebook
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('linkedin')} data-testid="share-linkedin">
                <FaLinkedin className="w-4 h-4 mr-2" />
                Share on LinkedIn
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('whatsapp')} data-testid="share-whatsapp">
                <FaWhatsapp className="w-4 h-4 mr-2" />
                Share on WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink} data-testid="share-copy-link">
                {copied ? <Check className="w-4 h-4 mr-2" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                {copied ? "Copied!" : "Copy Analysis Link"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="outline" 
            onClick={() => window.open(`/api/analyses/${analysis.id}/download`, '_blank')}
            data-testid="button-download-report"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
          <Button onClick={onNewAnalysis} data-testid="button-new-analysis">
            <Upload className="w-4 h-4 mr-2" />
            Analyze Another Video
          </Button>
        </div>
      </div>

      <Card className={`border-2 ${scoreInfo.borderColor} ${scoreInfo.bgColor}`}>
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="flex flex-col items-center text-center flex-shrink-0">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center ${scoreInfo.bgColor} mb-3`}>
                <VerdictIcon className={`w-12 h-12 ${scoreInfo.color}`} />
              </div>
              <div className="text-4xl font-bold mb-1" data-testid="text-ai-score">
                {aiScore}%
              </div>
              <Badge variant={scoreInfo.variant} className="text-sm px-4 py-1" data-testid="badge-verdict">
                {scoreInfo.label}
              </Badge>
            </div>
            
            <Separator orientation="vertical" className="hidden md:block h-auto self-stretch" />
            <Separator orientation="horizontal" className="block md:hidden w-full" />
            
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">What This Means</h3>
              </div>
              
              {analysis.aiSource && aiScore >= 50 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 border" data-testid="ai-source-info">
                  <Bot className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">Detected source: </span>
                    <Badge variant="secondary" className="ml-1" data-testid="badge-ai-source">
                      {analysis.aiSource}
                    </Badge>
                  </span>
                </div>
              )}
              
              {analysis.hiveAIResult?.isDeepfake && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800" data-testid="deepfake-warning">
                  <UserX className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-red-700 dark:text-red-400">
                    Face manipulation detected (deepfake confidence: {Math.round((analysis.hiveAIResult.deepfakeScore || 0) * 100)}%)
                  </span>
                </div>
              )}
              
              {analysis.plainSummary ? (
                <div className="text-muted-foreground leading-relaxed space-y-3" data-testid="text-plain-summary">
                  {analysis.plainSummary.split('\n\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground leading-relaxed" data-testid="text-plain-summary">
                  {aiScore >= 70 
                    ? "This video shows strong signs of being AI-generated. We recommend verifying its source before sharing or using it for important decisions."
                    : aiScore >= 40 
                    ? "We're not entirely certain about this video. It has some characteristics that could suggest AI generation, but also elements that appear authentic. Exercise caution."
                    : "This video appears to be authentic based on our analysis. We didn't detect significant indicators of AI generation."}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Collapsible open={showTechnicalDetails} onOpenChange={setShowTechnicalDetails}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between"
            data-testid="button-toggle-technical"
          >
            <span className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Technical Details
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showTechnicalDetails ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>AI Generation Likelihood</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-6">
                <CircularProgress value={aiScore} size={200} strokeWidth={12} />
                <div className="text-center space-y-2">
                  <Badge variant={scoreInfo.variant} className="text-sm px-3 py-1" data-testid="badge-score-label">
                    {scoreInfo.label}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Confidence: {aiScore}%
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Video Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MetadataItem 
                    icon={<Clock className="w-4 h-4" />}
                    label="Duration"
                    value={analysis.metadata?.duration ? `${analysis.metadata.duration.toFixed(1)}s` : 'N/A'}
                    testId="metadata-duration"
                  />
                  <MetadataItem 
                    icon={<Monitor className="w-4 h-4" />}
                    label="Resolution"
                    value={analysis.metadata?.width && analysis.metadata?.height 
                      ? `${analysis.metadata.width}x${analysis.metadata.height}` 
                      : 'N/A'}
                    testId="metadata-resolution"
                  />
                  <MetadataItem 
                    icon={<Film className="w-4 h-4" />}
                    label="Codec"
                    value={analysis.metadata?.codec || 'N/A'}
                    testId="metadata-codec"
                  />
                  <MetadataItem 
                    icon={<Activity className="w-4 h-4" />}
                    label="Bitrate"
                    value={analysis.metadata?.bitrate || 'N/A'}
                    testId="metadata-bitrate"
                  />
                  <MetadataItem 
                    icon={<Zap className="w-4 h-4" />}
                    label="Frame Rate"
                    value={analysis.metadata?.framerate || 'N/A'}
                    testId="metadata-framerate"
                  />
                  <MetadataItem 
                    icon={<Code className="w-4 h-4" />}
                    label="Software"
                    value={analysis.metadata?.software || 'N/A'}
                    testId="metadata-software"
                  />
                  <MetadataItem 
                    icon={<Calendar className="w-4 h-4" />}
                    label="Creation Time"
                    value={analysis.metadata?.creationTime || 'N/A'}
                    testId="metadata-creation"
                  />
                  <MetadataItem 
                    icon={<HardDrive className="w-4 h-4" />}
                    label="File Size"
                    value={`${(analysis.filesize / (1024 * 1024)).toFixed(2)} MB`}
                    testId="metadata-filesize"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {analysis.detectionIndicators && analysis.detectionIndicators.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Detection Indicators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.detectionIndicators.map((indicator, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-3 p-4 rounded-lg border bg-card"
                      data-testid={`indicator-${index}`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {indicator.detected ? (
                          <AlertTriangle className="w-5 h-5 text-destructive" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="text-sm font-medium">{indicator.name}</h4>
                          <Badge variant={indicator.detected ? "destructive" : "secondary"} className="text-xs">
                            {indicator.confidence}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {indicator.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {analysis.findings && analysis.findings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Detailed Findings</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {analysis.findings.map((finding, index) => (
                    <AccordionItem key={index} value={`finding-${index}`} data-testid={`finding-${index}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          {finding.severity === 'high' && <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />}
                          {finding.severity === 'medium' && <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />}
                          {finding.severity === 'low' && <Eye className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                          <span className="font-medium">{finding.category}</span>
                          <Badge variant={
                            finding.severity === 'high' ? 'destructive' : 
                            finding.severity === 'medium' ? 'secondary' : 
                            'outline'
                          } className="text-xs ml-auto">
                            {finding.severity}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        <div className="space-y-2 pt-2">
                          <p>{finding.description}</p>
                          {finding.frameTimestamp !== undefined && (
                            <p className="text-xs font-mono">
                              Timestamp: {finding.frameTimestamp.toFixed(2)}s
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
              <div>
                <strong className="text-foreground">Analysis Summary:</strong>{' '}
                {analysis.detectionMethod === 'hive_ai' ? (
                  <>
                    This analysis was performed using specialized AI detection technology trained to identify content from 
                    40+ AI video generators including Sora, Runway, Pika, and others. The system uses DoD-validated detection 
                    models for accurate synthetic media identification.
                  </>
                ) : analysis.detectionMethod === 'gemini' ? (
                  <>
                    This analysis used advanced AI vision models to inspect video frames for synthetic artifacts, temporal 
                    inconsistencies, and metadata anomalies commonly found in AI-generated content.
                  </>
                ) : (
                  <>
                    This analysis used heuristic methods to inspect video metadata and file characteristics for patterns 
                    commonly found in AI-generated content.
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs">
                  Detection method: <Badge variant="outline" className="ml-1 text-xs" data-testid="badge-detection-method">
                    {analysis.detectionMethod === 'hive_ai' ? 'Hive AI' : 
                     analysis.detectionMethod === 'gemini' ? 'Gemini Vision' : 
                     'Heuristic Analysis'}
                  </Badge>
                </span>
              </div>
              <p className="text-xs italic pt-1">
                Results are provided for informational purposes and should be combined with human judgment for critical decisions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface MetadataItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  testId?: string;
}

function MetadataItem({ icon, label, value, testId }: MetadataItemProps) {
  return (
    <div className="flex items-start gap-3" data-testid={testId}>
      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-mono font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
