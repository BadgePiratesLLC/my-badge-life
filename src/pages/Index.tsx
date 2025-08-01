import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { CameraCapture } from "@/components/CameraCapture";
import { BadgeCard } from "@/components/BadgeCard";
import { AuthModal } from "@/components/AuthModal";
import { AddBadgeModal } from "@/components/AddBadgeModal";
import { Search, Filter, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useBadges } from "@/hooks/useBadges";
import { useRoles } from "@/hooks/useRoles";

const Index = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showAddBadge, setShowAddBadge] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  
  // Real authentication and data - MUST call all hooks unconditionally
  const { user, profile, loading: authLoading, isAuthenticated } = useAuth();
  const { isAdmin } = useRoles();
  const { 
    badges, 
    loading: badgesLoading, 
    toggleOwnership, 
    isOwned, 
    isWanted, 
    getOwnershipStats,
    uploadBadgeImage 
  } = useBadges();

  // Show welcome screen for new users
  useEffect(() => {
    const hasVisited = localStorage.getItem('mybadgelife-visited');
    if (hasVisited) {
      setShowWelcome(false);
    }
  }, []);

  // Loading state with timeout fallback
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (authLoading) {
        console.log('Auth loading timeout - forcing continue');
        // Force continue after 5 seconds if still loading
        window.location.reload();
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [authLoading]);

  // Show minimal loading only briefly - but don't return early to avoid hooks issues
  const showLoading = authLoading;

  const handleGetStarted = () => {
    setShowWelcome(false);
    localStorage.setItem('mybadgelife-visited', 'true');
  };

  const handleCameraClick = () => {
    setShowCamera(true);
  };

  const handleImageCapture = async (file: File) => {
    try {
      const { url } = await uploadBadgeImage(file);
      toast({
        title: "Badge Image Uploaded!",
        description: "Image uploaded successfully. In the full version, AI will identify the badge automatically.",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOwnershipToggle = async (badgeId: string, type: 'own' | 'want') => {
    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }
    
    try {
      await toggleOwnership(badgeId, type);
      const action = isOwned(badgeId) || isWanted(badgeId) ? 'removed from' : 'added to';
      toast({
        title: `Badge ${action} ${type === 'own' ? 'collection' : 'wishlist'}!`,
        description: `Successfully updated your badge tracking.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update badge ownership. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAuthClick = () => {
    setShowAuth(true);
  };

  // Filter badges based on search
  const filteredBadges = badges.filter(badge =>
    badge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    badge.profiles?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    badge.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get ownership stats
  const stats = getOwnershipStats();

  if (showWelcome) {
    return <WelcomeScreen onGetStarted={handleGetStarted} />;
  }

  // Show loading screen if needed
  if (showLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="font-mono text-sm text-muted-foreground">INITIALIZING...</p>
          <p className="text-xs text-muted-foreground">
            If this takes too long, try refreshing the page
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        onCameraClick={handleCameraClick}
        onMenuClick={() => {}}
        isAuthenticated={isAuthenticated}
        onAuthClick={handleAuthClick}
        isAdmin={isAdmin()}
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
            {(isAuthenticated && (profile?.role === 'admin' || 
              (profile?.role === 'maker' && profile?.maker_approved))) && (
              <Button 
                variant="terminal" 
                size="mobile"
                onClick={() => setShowAddBadge(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">ADD</span>
              </Button>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        {badgesLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded p-3">
                <div className="h-6 bg-muted animate-pulse rounded mb-2"></div>
                <div className="h-4 bg-muted animate-pulse rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded p-3 text-center">
              <div className="text-lg font-bold font-mono text-primary">
                {stats.owned}
              </div>
              <div className="text-xs text-muted-foreground font-mono">OWNED</div>
            </div>
            <div className="bg-card border border-border rounded p-3 text-center">
              <div className="text-lg font-bold font-mono text-accent">
                {stats.wanted}
              </div>
              <div className="text-xs text-muted-foreground font-mono">WANTED</div>
            </div>
            <div className="bg-card border border-border rounded p-3 text-center">
              <div className="text-lg font-bold font-mono text-foreground">
                {stats.total}
              </div>
              <div className="text-xs text-muted-foreground font-mono">TOTAL</div>
            </div>
          </div>
        )}

        {/* Badge Grid */}
        {badgesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4">
                <div className="h-4 bg-muted animate-pulse rounded mb-3"></div>
                <div className="aspect-square bg-muted animate-pulse rounded mb-3"></div>
                <div className="h-3 bg-muted animate-pulse rounded mb-2"></div>
                <div className="h-3 bg-muted animate-pulse rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBadges.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={{
                  id: badge.id,
                  name: badge.name,
                  year: badge.year || undefined,
                  maker: badge.profiles?.display_name || undefined,
                  description: badge.description || undefined,
                  imageUrl: badge.image_url || undefined,
                  externalLink: badge.external_link || undefined,
                  isOwned: isOwned(badge.id),
                  isWanted: isWanted(badge.id),
                }}
                onOwnershipToggle={handleOwnershipToggle}
                onBadgeClick={(badge) => {
                  toast({
                    title: badge.name,
                    description: `${badge.year ? badge.year + ' • ' : ''}Made by ${badge.maker || 'Unknown'}`,
                  });
                }}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        )}

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

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
      />

      <AddBadgeModal
        isOpen={showAddBadge}
        onClose={() => setShowAddBadge(false)}
      />
    </div>
  );
};

export default Index;
