import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Upload, FileVideo, X, AlertCircle, Link as LinkIcon, Mail, ChevronDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { VideoAnalysis } from "@shared/schema";

interface VideoUploaderProps {
  onAnalysisStart: () => void;
  onAnalysisComplete: (analysis: VideoAnalysis) => void;
}

export function VideoUploader({ onAnalysisStart, onAnalysisComplete }: VideoUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [showEmailOption, setShowEmailOption] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const videoFile = acceptedFiles[0];
      
      if (videoFile.size > 500 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a video smaller than 500MB",
          variant: "destructive",
        });
        return;
      }
      
      setFile(videoFile);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm']
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgress(10);
      onAnalysisStart();

      const formData = new FormData();
      formData.append('video', file);
      if (userEmail.trim()) {
        formData.append('email', userEmail.trim());
      }

      setUploadProgress(30);

      const response = await fetch('/api/analyze-video', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      setUploadProgress(100);

      const analysis: VideoAnalysis = await response.json();
      
      setFile(null);
      setUserEmail("");
      setShowEmailOption(false);
      setUploadProgress(0);
      setIsUploading(false);
      
      onAnalysisComplete(analysis);
      
      const emailSent = userEmail.trim() ? " We'll also send you an email with the results." : "";
      toast({
        title: "Analysis Complete",
        description: `Your video has been successfully analyzed.${emailSent}`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "There was an error analyzing your video. Please try again.",
        variant: "destructive",
      });
      setIsUploading(false);
      setFile(null);
      setUploadProgress(0);
    }
  };

  const handleUrlAnalysis = async () => {
    if (!videoUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a valid video URL",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);
      onAnalysisStart();

      setUploadProgress(30);

      const requestBody: { url: string; email?: string } = { url: videoUrl };
      if (userEmail.trim()) {
        requestBody.email = userEmail.trim();
      }

      const response = await fetch('/api/analyze-video-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      let errorData;
      if (!response.ok) {
        try {
          errorData = await response.json();
        } catch {
          throw new Error(`Request failed with status ${response.status}`);
        }
        throw new Error(errorData.error || 'URL analysis failed');
      }

      setUploadProgress(100);

      const analysis: VideoAnalysis = await response.json();
      
      setVideoUrl("");
      setUserEmail("");
      setShowEmailOption(false);
      setUploadProgress(0);
      setIsUploading(false);
      
      onAnalysisComplete(analysis);
      
      const emailSent = userEmail.trim() ? " We'll also send you an email with the results." : "";
      toast({
        title: "Analysis Complete",
        description: `Your video has been successfully analyzed.${emailSent}`,
      });
    } catch (error) {
      console.error('URL analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "There was an error analyzing the video URL. Please try again.",
        variant: "destructive",
      });
      setIsUploading(false);
      setVideoUrl("");
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setUploadProgress(0);
  };

  const handleClearUrl = () => {
    setVideoUrl("");
    setUploadProgress(0);
  };

  return (
    <div className="space-y-6">
      <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as "file" | "url")} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file" data-testid="tab-upload-file">
            <Upload className="w-4 h-4 mr-2" />
            Upload File
          </TabsTrigger>
          <TabsTrigger value="url" data-testid="tab-paste-url">
            <LinkIcon className="w-4 h-4 mr-2" />
            Paste URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="mt-6">
          {!file ? (
        <Card 
          {...getRootProps()} 
          className={`
            min-h-96 border-2 border-dashed cursor-pointer transition-all
            ${isDragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50 hover:bg-muted/30'}
            ${isUploading ? 'cursor-not-allowed opacity-50' : ''}
          `}
          data-testid="dropzone-upload"
        >
          <CardContent className="flex flex-col items-center justify-center p-12 text-center h-full">
            <input {...getInputProps()} data-testid="input-file" />
            <div className={`w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 transition-transform ${isDragActive ? 'scale-110' : ''}`}>
              <Upload className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {isDragActive ? 'Drop video here' : 'Drag & drop your video'}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              or click to browse files. Supports MP4, MOV, AVI, WebM up to 500MB
            </p>
            <Button type="button" data-testid="button-browse">
              Browse Files
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="card-file-preview">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileVideo className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate font-mono text-sm" data-testid="text-filename">
                  {file.name}
                </p>
                <p className="text-sm text-muted-foreground" data-testid="text-filesize">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              {!isUploading && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  data-testid="button-remove-file"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {isUploading && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Uploading and analyzing...</span>
                  <span className="font-medium" data-testid="text-progress">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" data-testid="progress-upload" />
              </div>
            )}

            {!isUploading && (
              <>
                <Collapsible 
                  open={showEmailOption} 
                  onOpenChange={setShowEmailOption}
                  className="mt-4"
                >
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-between text-muted-foreground hover:text-foreground"
                      data-testid="button-toggle-email"
                    >
                      <span className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Get notified by email (optional)
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showEmailOption ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      data-testid="input-email-file"
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      We'll send you a summary when your analysis is complete
                    </p>
                  </CollapsibleContent>
                </Collapsible>

                <div className="mt-4 flex gap-3">
                  <Button 
                    onClick={handleUpload}
                    className="flex-1"
                    data-testid="button-start-analysis"
                  >
                    Start Analysis
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleRemoveFile}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="url" className="mt-6">
          <Card data-testid="card-url-input">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor="video-url" className="text-sm font-medium">
                  Video URL
                </label>
                <div className="flex gap-3">
                  <Input
                    id="video-url"
                    type="url"
                    placeholder="https://example.com/video.mp4"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    disabled={isUploading}
                    data-testid="input-video-url"
                    className="flex-1"
                  />
                  {videoUrl && !isUploading && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClearUrl}
                      data-testid="button-clear-url"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter a direct link to a video file (MP4, MOV, AVI, WebM)
                </p>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Downloading and analyzing...</span>
                    <span className="font-medium" data-testid="text-url-progress">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" data-testid="progress-url-upload" />
                </div>
              )}

              {!isUploading && (
                <>
                  <Collapsible 
                    open={showEmailOption} 
                    onOpenChange={setShowEmailOption}
                  >
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-between text-muted-foreground hover:text-foreground"
                        data-testid="button-toggle-email-url"
                      >
                        <span className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Get notified by email (optional)
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showEmailOption ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        data-testid="input-email-url"
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        We'll send you a summary when your analysis is complete
                      </p>
                    </CollapsibleContent>
                  </Collapsible>

                  <Button 
                    onClick={handleUrlAnalysis}
                    className="w-full"
                    disabled={!videoUrl.trim()}
                    data-testid="button-analyze-url"
                  >
                    <FileVideo className="w-4 h-4 mr-2" />
                    Analyze Video from URL
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Privacy Notice:</strong> Your video is processed securely and deleted after analysis. 
              We only store analysis results, not the original video file.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
