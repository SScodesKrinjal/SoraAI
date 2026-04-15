import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Eye, BarChart3, FileText, Upload, Search, Zap, CheckCircle2, ArrowRight, History, Cloud } from "lucide-react";
import heroImage from "@assets/generated_images/AI_video_analysis_hero_image_243480c4.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="absolute top-0 left-0 right-0 z-20 bg-transparent">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-white font-semibold text-lg">AI Video Detective</div>
          <div className="flex items-center gap-2">
            <Link href="/nextcloud">
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/10"
                data-testid="button-nextcloud-settings"
              >
                <Cloud className="w-4 h-4 mr-2" />
                Nextcloud
              </Button>
            </Link>
            <Link href="/history">
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/10"
                data-testid="button-view-history"
              >
                <History className="w-4 h-4 mr-2" />
                View History
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      <section 
        className="relative min-h-[80vh] flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70" />
        
        <div className="relative z-10 w-full max-w-4xl mx-auto px-6 py-24 text-center">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight text-white mb-6">
            Combat AI-Generated Video Fraud
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed max-w-3xl mx-auto">
            Advanced detection platform for identifying AI-generated videos, including Sora 2 content with watermarks removed. 
            Get instant analysis with metadata inspection and AI-powered visual detection.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
            <Link href="/analyze">
              <Button 
                size="lg" 
                className="px-8 py-4 text-lg backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold"
                data-testid="button-upload-video"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload Video for Analysis
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline"
              className="px-8 py-4 text-lg backdrop-blur-md bg-black/20 hover:bg-black/30 border border-white/30 text-white font-semibold"
              data-testid="button-how-it-works"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              See How It Works
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
          
          <p className="text-sm text-white/70 font-medium">
            Powered by Advanced AI Vision Models
          </p>
        </div>
      </section>

      <section className="w-full max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover-elevate transition-all duration-300" data-testid="card-feature-metadata">
            <CardContent className="p-8">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Metadata Analysis</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Deep inspection of video metadata, encoding details, and creation timestamps to identify AI generation patterns.
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all duration-300" data-testid="card-feature-visual">
            <CardContent className="p-8">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Visual Inspection</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI-powered frame-by-frame analysis detecting synthetic artifacts, unnatural motion, and lighting anomalies.
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all duration-300" data-testid="card-feature-confidence">
            <CardContent className="p-8">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Confidence Scoring</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Comprehensive confidence metrics with detailed breakdowns for each detection indicator and finding.
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all duration-300" data-testid="card-feature-reports">
            <CardContent className="p-8">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Detailed Reports</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Exportable analysis reports with technical findings, timestamps, and visual evidence for documentation.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="how-it-works" className="w-full bg-muted/30 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-16">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center" data-testid="step-upload">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4">
                1
              </div>
              <Upload className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-xl font-semibold mb-2">Upload</h3>
              <p className="text-sm text-muted-foreground">
                Upload your video file (MP4, MOV, AVI) for analysis
              </p>
            </div>

            <div className="flex flex-col items-center text-center" data-testid="step-extract">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4">
                2
              </div>
              <Search className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-xl font-semibold mb-2">Extract Metadata</h3>
              <p className="text-sm text-muted-foreground">
                Analyze technical metadata and encoding information
              </p>
            </div>

            <div className="flex flex-col items-center text-center" data-testid="step-analyze">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4">
                3
              </div>
              <Zap className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-xl font-semibold mb-2">Analyze Frames</h3>
              <p className="text-sm text-muted-foreground">
                AI inspection of video frames for synthetic indicators
              </p>
            </div>

            <div className="flex flex-col items-center text-center" data-testid="step-report">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4">
                4
              </div>
              <FileText className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-xl font-semibold mb-2">Generate Report</h3>
              <p className="text-sm text-muted-foreground">
                Receive detailed analysis with confidence scores
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-semibold mb-6">Technical Capabilities</h2>
              <ul className="space-y-4">
                {[
                  'Watermark removal detection',
                  'Synthetic artifact identification',
                  'Temporal inconsistency analysis',
                  'Unnatural motion pattern detection',
                  'Lighting anomaly inspection',
                  'Codec and encoding analysis',
                  'Frame-by-frame AI scoring',
                  'Detailed metadata extraction'
                ].map((capability, i) => (
                  <li key={i} className="flex items-start gap-3" data-testid={`capability-${i}`}>
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-base leading-relaxed">{capability}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-8 border">
              <div className="aspect-video bg-background rounded-lg flex items-center justify-center mb-4">
                <Eye className="w-16 h-16 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Sample analysis visualization showing detected AI generation indicators
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-primary/5 py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold mb-6">Ready to Detect AI-Generated Videos?</h2>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Upload your video now for instant analysis and comprehensive detection results.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/analyze">
              <Button size="lg" className="px-8 py-4 text-lg" data-testid="button-cta-upload">
                <Upload className="w-5 h-5 mr-2" />
                Upload Video for Analysis
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="w-full border-t bg-muted/20 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-3">About</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI Video Detective helps combat deepfakes and AI-generated video fraud through advanced detection technology.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Contact</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Questions about our detection platform?
              </p>
              <p className="text-sm text-muted-foreground">
                contact@videodetective.ai
              </p>
            </div>
          </div>
          <div className="pt-8 border-t text-center text-sm text-muted-foreground">
            © 2025 AI Video Detective. Powered by Gemini AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
