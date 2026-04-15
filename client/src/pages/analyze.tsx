import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, ArrowLeft, Loader2 } from "lucide-react";
import { VideoUploader } from "@/components/video-uploader";
import { VideoAnalysisResults } from "@/components/video-analysis-results";
import type { VideoAnalysis } from "@shared/schema";

export default function Analyze() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const analysisId = urlParams.get('id');

  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: existingAnalysis, isLoading: isLoadingAnalysis } = useQuery<VideoAnalysis>({
    queryKey: ['/api/analyses', analysisId],
    queryFn: async () => {
      if (!analysisId) throw new Error('No analysis ID provided');
      const response = await fetch(`/api/analyses/${analysisId}`);
      if (!response.ok) throw new Error('Failed to fetch analysis');
      return response.json();
    },
    enabled: !!analysisId,
  });

  useEffect(() => {
    if (existingAnalysis) {
      setAnalysis(existingAnalysis);
    }
  }, [existingAnalysis]);

  const handleAnalysisComplete = (result: VideoAnalysis) => {
    setAnalysis(result);
    setIsAnalyzing(false);
  };

  const handleNewAnalysis = () => {
    setAnalysis(null);
    setIsAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">AI Video Detective</h1>
          <div className="w-24" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {isLoadingAnalysis && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Loading analysis...</p>
            </div>
          </div>
        )}

        {!analysis && !isAnalyzing && !isLoadingAnalysis && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-semibold">Upload Video for Analysis</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Upload your video file to detect AI generation patterns, analyze metadata, and receive detailed findings.
              </p>
            </div>

            <VideoUploader 
              onAnalysisStart={() => setIsAnalyzing(true)}
              onAnalysisComplete={handleAnalysisComplete}
            />

            <Card>
              <CardHeader>
                <CardTitle>Supported Formats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Video Formats</h4>
                  <p className="text-sm text-muted-foreground">MP4, MOV, AVI, WebM</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Maximum File Size</h4>
                  <p className="text-sm text-muted-foreground">500 MB per video</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Analysis Time</h4>
                  <p className="text-sm text-muted-foreground">Typically 30-90 seconds depending on video length</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {isAnalyzing && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-12 text-center space-y-6">
              <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Analyzing Video...</h3>
                <p className="text-sm text-muted-foreground">
                  Extracting metadata, analyzing frames, and detecting AI generation patterns
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {analysis && (
          <VideoAnalysisResults 
            analysis={analysis} 
            onNewAnalysis={handleNewAnalysis}
          />
        )}
      </main>
    </div>
  );
}
