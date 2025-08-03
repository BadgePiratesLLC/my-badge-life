import { Camera, Search, Users, Shield, User, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import mybadgelifeLogo from "@/assets/mybadgelife-logo.jpg";

interface WelcomeScreenProps {
  onLogin: () => void;
  onStartScan: () => void;
  onExploreCollection: () => void;
}

export const WelcomeScreen = ({ onLogin, onStartScan, onExploreCollection }: WelcomeScreenProps) => {
  return (
    <div className="min-h-screen bg-gradient-dark flex flex-col">
      {/* Simple Header */}
      <header className="flex justify-between items-center p-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded border border-primary/30 overflow-hidden">
            <img 
              src={mybadgelifeLogo} 
              alt="MyBadgeLife"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-mono text-sm text-foreground">My Badge Life</span>
        </div>
        <div className="flex items-center space-x-2">
          {/* Bug Report Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open('https://github.com/BadgePiratesLLC/my-badge-life/issues/new?template=bug_report.md', '_blank')}
            className="text-muted-foreground hover:text-foreground"
          >
            <Bug className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={onLogin}
            className="relative"
          >
            <User className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          {/* Logo and Title */}
          <div className="space-y-4">
            <div className="mx-auto w-24 h-24 rounded-lg border border-primary/30 overflow-hidden matrix-glow">
              <img 
                src={mybadgelifeLogo} 
                alt="MyBadgeLife"
                className="w-full h-full object-cover"
              />
            </div>
            
            <div>
              <h1 className="text-hero gradient-text font-bold font-mono">
                My Badge Life
              </h1>
              <p className="text-subtitle text-muted-foreground font-mono mt-2">
                Track every badge. Connect with makers.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4 text-center">
                <Camera className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-xs font-mono text-foreground">SCAN</p>
                <p className="text-xs text-muted-foreground">Badge ID</p>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4 text-center">
                <Search className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-xs font-mono text-foreground">EXPLORE</p>
                <p className="text-xs text-muted-foreground">Collection</p>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-xs font-mono text-foreground">CONNECT</p>
                <p className="text-xs text-muted-foreground">Makers</p>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4 text-center">
                <Shield className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-xs font-mono text-foreground">TRACK</p>
                <p className="text-xs text-muted-foreground">Progress</p>
              </CardContent>
            </Card>
          </div>

          {/* Call to Action */}
          <div className="space-y-3">
            <Button
              variant="matrix"
              size="lg"
              onClick={onStartScan}
              className="w-full"
            >
              <Camera className="h-5 w-5" />
              START SCANNING
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={onExploreCollection}
              className="w-full"
            >
              <Search className="h-5 w-5" />
              EXPLORE COLLECTION
            </Button>
          </div>

          <p className="text-xs text-muted-foreground font-mono">
            Perfect for DEF CON, BSides, and every hacker conference
          </p>

          {/* Footer */}
          <div className="pt-8 border-t border-border">
            <p className="text-xs text-muted-foreground font-mono">
              Built by hackers, for hackers
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};