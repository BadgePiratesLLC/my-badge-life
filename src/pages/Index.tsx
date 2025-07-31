import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { CameraCapture } from "@/components/CameraCapture";
import { BadgeCard } from "@/components/BadgeCard";
import { Search, Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Mock badge data for demo
  const mockBadges = [
    {
      id: "1",
      name: "DEF CON 31 Badge",
      year: 2023,
      maker: "DC Organization",
      description: "Official conference badge with interactive LED matrix and crypto challenges.",
      imageUrl: "/placeholder.svg",
      externalLink: "https://defcon.org",
      isOwned: false,
      isWanted: true,
    },
    {
      id: "2", 
      name: "BSides LV 2023",
      year: 2023,
      maker: "BSides Team",
      description: "Community badge featuring NFC capabilities and custom firmware.",
      imageUrl: "/placeholder.svg",
      isOwned: true,
      isWanted: false,
    },
    {
      id: "3",
      name: "Hacker Summer Camp",
      year: 2023,
      maker: "Independent Maker",
      description: "Artistic badge with RGB lighting and sound reactive features.",
      imageUrl: "/placeholder.svg",
      isOwned: false,
      isWanted: false,
    },
  ];

  const handleGetStarted = () => {
    setShowWelcome(false);
  };

  const handleCameraClick = () => {
    setShowCamera(true);
  };

  const handleImageCapture = (file: File) => {
    toast({
      title: "Badge Scanned!",
      description: "Analyzing badge image... This feature will identify badges using AI in the full version.",
    });
  };

  const handleOwnershipToggle = (badgeId: string, type: 'own' | 'want') => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to track badge ownership.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: `Badge ${type === 'own' ? 'Owned' : 'Wanted'}!`,
      description: `Added to your ${type === 'own' ? 'collection' : 'wishlist'}.`,
    });
  };

  const handleAuthClick = () => {
    if (isAuthenticated) {
      setIsAuthenticated(false);
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully.",
      });
    } else {
      setIsAuthenticated(true);
      toast({
        title: "Signed In!",
        description: "Welcome to MyBadgeLife! You can now track badges.",
      });
    }
  };

  const filteredBadges = mockBadges.filter(badge =>
    badge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    badge.maker?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (showWelcome) {
    return <WelcomeScreen onGetStarted={handleGetStarted} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        onCameraClick={handleCameraClick}
        onMenuClick={() => {}}
        isAuthenticated={isAuthenticated}
        onAuthClick={handleAuthClick}
      />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search badges, makers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 font-mono"
            />
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="mobile">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">FILTER</span>
            </Button>
            {isAuthenticated && (
              <Button variant="terminal" size="mobile">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">ADD</span>
              </Button>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded p-3 text-center">
            <div className="text-lg font-bold font-mono text-primary">
              {mockBadges.filter(b => b.isOwned).length}
            </div>
            <div className="text-xs text-muted-foreground font-mono">OWNED</div>
          </div>
          <div className="bg-card border border-border rounded p-3 text-center">
            <div className="text-lg font-bold font-mono text-accent">
              {mockBadges.filter(b => b.isWanted).length}
            </div>
            <div className="text-xs text-muted-foreground font-mono">WANTED</div>
          </div>
          <div className="bg-card border border-border rounded p-3 text-center">
            <div className="text-lg font-bold font-mono text-foreground">
              {mockBadges.length}
            </div>
            <div className="text-xs text-muted-foreground font-mono">TOTAL</div>
          </div>
        </div>

        {/* Badge Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBadges.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              onOwnershipToggle={handleOwnershipToggle}
              onBadgeClick={(badge) => {
                toast({
                  title: badge.name,
                  description: `${badge.year} • Made by ${badge.maker}`,
                });
              }}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredBadges.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-mono text-foreground mb-2">No badges found</h3>
            <p className="text-muted-foreground text-sm">
              Try adjusting your search or add new badges to the database.
            </p>
          </div>
        )}
      </main>

      <CameraCapture
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onImageCapture={handleImageCapture}
      />
    </div>
  );
};

export default Index;
