import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, FileVideo, TrendingUp } from "lucide-react";
import type { VideoAnalysis } from "@shared/schema";
import { CircularProgress } from "@/components/circular-progress";
import { Link } from "wouter";

export default function History() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: analyses, isLoading } = useQuery<VideoAnalysis[]>({
    queryKey: ['/api/analyses'],
    queryFn: async () => {
      const response = await fetch('/api/analyses');
      if (!response.ok) throw new Error('Failed to fetch analyses');
      return response.json();
    },
  });

  const filteredAnalyses = analyses?.filter((analysis) =>
    analysis.filename.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getScoreLabel = (score: number) => {
    if (score < 30) return { label: "Likely Authentic", variant: "default" as const };
    if (score < 70) return { label: "Inconclusive", variant: "secondary" as const };
    return { label: "Likely AI-Generated", variant: "destructive" as const };
  };

  return (
    <div className="container mx-auto py-12 px-4 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Analysis History</h1>
            <p className="text-muted-foreground">
              View and search all your previous video analyses
            </p>
          </div>
          <Link href="/analyze">
            <Button data-testid="button-new-analysis">
              <FileVideo className="w-4 h-4 mr-2" />
              New Analysis
            </Button>
          </Link>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading analyses...</p>
          </div>
        </div>
      ) : filteredAnalyses.length === 0 ? (
        <Card>
          <CardContent className="py-20">
            <div className="text-center space-y-4">
              <FileVideo className="w-16 h-16 mx-auto text-muted-foreground/50" />
              <div>
                <h3 className="text-lg font-semibold mb-2">No analyses found</h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "Try a different search term"
                    : "Upload a video to get started"}
                </p>
              </div>
              {!searchQuery && (
                <Link href="/analyze">
                  <Button>Analyze Your First Video</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            Showing {filteredAnalyses.length} {filteredAnalyses.length === 1 ? 'analysis' : 'analyses'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAnalyses.map((analysis) => {
              const scoreInfo = getScoreLabel(analysis.aiScore || 0);
              return (
                <Card 
                  key={analysis.id} 
                  className="hover-elevate transition-all cursor-pointer"
                  data-testid={`card-analysis-${analysis.id}`}
                >
                  <CardHeader>
                    <div className="space-y-3">
                      <CircularProgress 
                        value={analysis.aiScore || 0} 
                        size={120} 
                        strokeWidth={8}
                      />
                      <div>
                        <CardTitle className="text-base font-mono truncate" title={analysis.filename}>
                          {analysis.filename}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(analysis.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Badge variant={scoreInfo.variant} data-testid="badge-score">
                        {scoreInfo.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Resolution</span>
                        <p className="font-mono">
                          {analysis.metadata?.width}x{analysis.metadata?.height}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duration</span>
                        <p className="font-mono">
                          {analysis.metadata?.duration?.toFixed(1)}s
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Codec</span>
                        <p className="font-mono truncate">
                          {analysis.metadata?.codec || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Size</span>
                        <p className="font-mono">
                          {(analysis.filesize / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/analyze?id=${analysis.id}`} className="flex-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          data-testid="button-view-details"
                        >
                          View Details
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.open(`/api/analyses/${analysis.id}/download`, '_blank')}
                        data-testid="button-download"
                      >
                        <TrendingUp className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
