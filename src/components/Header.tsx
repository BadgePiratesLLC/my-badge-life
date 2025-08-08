import { Button } from "@/components/ui/button";
import { Camera, Menu, User, Shield, Bug } from "lucide-react";
import { Link } from "react-router-dom";
import mybadgelifeLogo from "@/assets/mybadgelife-logo.jpg";
import { useAdminAccess } from "@/hooks/useAdminAccess";

interface HeaderProps {
  onCameraClick: () => void;
  onMenuClick: () => void;
  isAuthenticated: boolean;
  onAuthClick: () => void;
}

export const Header = ({ onCameraClick, onMenuClick, isAuthenticated, onAuthClick }: HeaderProps) => {
  const { canAccessAdmin } = useAdminAccess();
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <img 
            src={mybadgelifeLogo} 
            alt="MyBadgeLife"
            className="h-8 w-8 rounded border border-primary/30"
          />
          <div className="flex flex-col">
            <span className="text-hero gradient-text font-bold">My Badge Life</span>
            <span className="text-xs text-muted-foreground font-mono">BADGE TRACKER</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="matrix"
            size="mobile"
            onClick={onCameraClick}
            className="flex items-center space-x-2"
          >
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">SCAN</span>
          </Button>
          
          
          {/* Admin Button */}
          {canAccessAdmin() && (
            <Link to="/admin">
              <Button
                variant="ghost"
                size="icon"
                className="text-orange-500 hover:text-orange-400"
              >
                <Shield className="h-4 w-4" />
              </Button>
            </Link>
          )}
          
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
            variant="ghost"
            size="icon"
            onClick={onAuthClick}
            className="relative text-muted-foreground hover:text-foreground"
          >
            <User className="h-4 w-4" />
            {isAuthenticated && (
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-pulse" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};