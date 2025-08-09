import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { CameraCapture } from "@/components/CameraCapture";
import { BadgeCard } from "@/components/BadgeCard";
import { BadgeListItem } from "@/components/BadgeListItem";
import { BadgeDetailModal } from "@/components/BadgeDetailModal";
import { BadgeExplorer } from "@/components/BadgeExplorer";
import { AuthModal } from "@/components/AuthModal";
import { AddBadgeModal } from "@/components/AddBadgeModal";
import { Search, Filter, Plus, Loader2, Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useBadges } from "@/hooks/useBadges";
import { useAuthContext } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  console.log('🏠 Index component rendering...');
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCamera, setShowCamera] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showAddBadge, setShowAddBadge] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [badgePrefillData, setBadgePrefillData] = useState<any>(null);
  const [selectedBadge, setSelectedBadge] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return isMobile === true ? 'list' : 'grid';
  });
  
  // Update view mode when mobile detection changes
  useEffect(() => {
    if (isMobile === true && viewMode === 'grid') {
      setViewMode('list');
    }
  }, [isMobile, viewMode]);
  
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { toast } = useToast();
  
  // Real authentication and data - MUST call all hooks unconditionally
  const { 
    user, 
    profile, 
    loading: authLoading, 
    initialized: authInitialized,
    isAuthenticated, 
    canManageBadges,
    canAccessAdmin
  } = useAuthContext();
  
  // Debug logging for auth state in Index
  console.log('🏠 Index auth state:', {
    user: user?.email,
    profile: profile?.role,
    authLoading,
    authInitialized,
    isAuthenticated,
    canManageBadges,
    canAccessAdmin
  });
  
  const { 
    badges, 
    loading: badgesLoading, 
    isOwned, 
    isWanted, 
    getOwnershipStats,
    uploadBadgeImage 
  } = useBadges();

  // Loading state with timeout fallback
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (authLoading) {
        console.log('Auth loading timeout - forcing continue');
        // Force continue after 10 seconds if still loading
        window.location.reload();
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [authLoading]);

  // Handle Discord badge links - check URL parameters for badge ID
  useEffect(() => {
    const badgeIdFromUrl = searchParams.get('badge');
    if (badgeIdFromUrl && badges.length > 0 && !selectedBadge) {
      const targetBadge = badges.find(badge => badge.id === badgeIdFromUrl);
      if (targetBadge) {
        console.log('Opening badge from Discord link:', targetBadge.name);
        setSelectedBadge({
          id: targetBadge.id,
          name: targetBadge.name,
          year: targetBadge.year || undefined,
          maker: targetBadge.profiles?.display_name || undefined,
          description: targetBadge.description || undefined,
          imageUrl: targetBadge.image_url || undefined,
          externalLink: targetBadge.external_link || undefined,
          isOwned: isOwned(targetBadge.id),
          isWanted: isWanted(targetBadge.id),
          retired: targetBadge.retired,
          category: targetBadge.category,
          teamName: targetBadge.team_name,
          profiles: targetBadge.profiles ? [targetBadge.profiles] : undefined,
        });
        setIsDetailModalOpen(true);
        // Clear the URL parameter after opening the modal
        setSearchParams({});
        
        toast({
          title: "Badge Opened from Discord",
          description: `Viewing ${targetBadge.name} from Discord notification.`,
        });
      } else {
        // Badge not found
        toast({
          title: "Badge Not Found",
          description: "The requested badge could not be found.",
          variant: "destructive",
        });
        setSearchParams({});
      }
    }
  }, [badges, searchParams, setSearchParams, selectedBadge, isOwned, isWanted, toast]);

  // Show minimal loading only for initial auth check, but not if user is clearly unauthenticated
  const showLoading = authLoading && user === undefined;

  const handleCameraClick = () => {
    console.log('Camera clicked. Auth state:', { isAuthenticated, user: user?.email, profile: profile?.role });
    setShowCamera(true);
  };

  const handleImageCapture = async (file: File) => {
    // Allow image uploads without authentication
    try {
      const { url } = await uploadBadgeImage(file);
      toast({
        title: "Badge Image Uploaded!",
        description: "Image uploaded successfully. Check uploads in admin panel.",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: `Failed to upload image: ${error?.message || 'Unknown error'}`,
        variant: "destructive",
      });
      throw error; // Re-throw so CameraCapture can handle it
    }
  };

  const handleCreateBadgeWithPrefill = (prefillData: any) => {
    setBadgePrefillData(prefillData);
    setShowAddBadge(true);
  };

  const handleOwnershipToggle = async (badgeId: string, type: 'own' | 'want') => {
    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }
    
    // Note: Ownership toggle is now handled by the individual badge components using useBadgeStats
    // This handler is kept for backward compatibility but will not be called
  };

  const handleAuthClick = () => {
    setShowAuth(true);
  };

  const handleLogin = () => {
    console.log('Login button clicked from welcome screen');
    setShowAuth(true);
  };

  const handleStartScan = () => {
    setShowCamera(true);
  };

  const handleExploreCollection = () => {
    setShowAllBadges(true);
  };

  // Filter badges based on search and selected filter
  const getFilteredBadges = () => {
    return badges.filter(badge => {
      // First apply search filter
      const matchesSearch = badge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        badge.profiles?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        badge.description?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Then apply ownership filter based on selectedFilter
      switch (selectedFilter) {
        case 'all':
          return true;
        case 'own':
          return isAuthenticated && isOwned(badge.id);
        case 'want':
          return isAuthenticated && isWanted(badge.id);
        case 'available':
          return isAuthenticated && !isOwned(badge.id) && !isWanted(badge.id);
        case 'retired':
          return badge.retired;
        default:
          return true;
      }
    });
  };

  // Get ownership stats
  const stats = getOwnershipStats();

  // Show loading screen if needed
  if (showLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header
          onCameraClick={handleCameraClick}
          onMenuClick={() => {}}
          isAuthenticated={isAuthenticated}
          onAuthClick={handleAuthClick}
        />
        <main className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="font-mono text-sm text-muted-foreground">INITIALIZING...</p>
              <p className="text-xs text-muted-foreground">
                If this takes too long, try refreshing the page
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show welcome screen only if badges are still loading (first time)
  if (badgesLoading && badges.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header
          onCameraClick={handleCameraClick}
          onMenuClick={() => {}}
          isAuthenticated={isAuthenticated}
          onAuthClick={handleAuthClick}
        />
        <main className="container mx-auto px-4 py-6">
          <WelcomeScreen onLogin={handleLogin} onStartScan={handleStartScan} onExploreCollection={handleExploreCollection} showInlineHeader={false} />
        </main>
        <BadgeExplorer 
          isOpen={showAllBadges} 
          onClose={() => setShowAllBadges(false)}
          onSignIn={handleLogin}
          isAuthenticated={isAuthenticated}
        />
        <CameraCapture
          isOpen={showCamera}
          onClose={() => setShowCamera(false)}
          onImageCapture={handleImageCapture}
          enableMatching={true}
          onCreateBadge={handleCreateBadgeWithPrefill}
          onAuthRequired={() => setShowAuth(true)}
        />
        <AuthModal
          isOpen={showAuth}
          onClose={() => setShowAuth(false)}
        />
      </div>
    );
  }

  // Get filtered badges
  const filteredBadges = getFilteredBadges();
  const ownedCount = isAuthenticated ? badges.filter(badge => isOwned(badge.id)).length : 0;
  const wantedCount = isAuthenticated ? badges.filter(badge => isWanted(badge.id)).length : 0;

  const renderBadges = (badges: typeof filteredBadges) => {
    if (badgesLoading) {
      return viewMode === 'grid' ? (
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
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-3">
              <div className="h-4 bg-muted animate-pulse rounded mb-2"></div>
              <div className="h-3 bg-muted animate-pulse rounded w-3/4"></div>
            </div>
          ))}
        </div>
      );
    }

    if (badges.length === 0) {
      return (
        <div className="text-center py-8 bg-card border border-border rounded-lg">
          <p className="text-muted-foreground font-mono text-sm">
            {searchQuery ? "No badges found matching your search." : "No badges found."}
          </p>
        </div>
      );
    }

    return viewMode === 'grid' ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {badges.map((badge) => (
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
               isOwned: isAuthenticated ? isOwned(badge.id) : false,
               isWanted: isAuthenticated ? isWanted(badge.id) : false,
              retired: badge.retired,
            }}
            onOwnershipToggle={handleOwnershipToggle}
            onBadgeClick={(badgeData) => {
              const fullBadge = badges.find(b => b.id === badgeData.id);
              if (fullBadge) {
                setSelectedBadge({
                  ...badgeData,
                  category: fullBadge.category,
                  teamName: fullBadge.team_name,
                  profiles: fullBadge.profiles ? [fullBadge.profiles] : undefined,
                });
                setIsDetailModalOpen(true);
              }
            }}
            isAuthenticated={isAuthenticated}
          />
        ))}
      </div>
    ) : (
      <div className="space-y-2">
        {badges.map((badge, index) => (
          <div key={badge.id} style={{ animationDelay: `${index * 50}ms` }}>
            <BadgeListItem
              badge={{
                id: badge.id,
                name: badge.name,
                year: badge.year || undefined,
                maker: badge.profiles?.display_name || undefined,
                description: badge.description || undefined,
                imageUrl: badge.image_url || undefined,
                externalLink: badge.external_link || undefined,
                 isOwned: isAuthenticated ? isOwned(badge.id) : false,
                 isWanted: isAuthenticated ? isWanted(badge.id) : false,
                retired: badge.retired,
              }}
              onOwnershipToggle={handleOwnershipToggle}
              onBadgeClick={(badgeData) => {
                const fullBadge = badges.find(b => b.id === badgeData.id);
                if (fullBadge) {
                  setSelectedBadge({
                    ...badgeData,
                    category: fullBadge.category,
                    teamName: fullBadge.team_name,
                    profiles: fullBadge.profiles ? [fullBadge.profiles] : undefined,
                  });
                  setIsDetailModalOpen(true);
                }
              }}
              isAuthenticated={isAuthenticated}
            />
          </div>
        ))}
      </div>
    );
  };

  console.log('🏠 Index about to render Header with isAuthenticated:', isAuthenticated);

  return (
    <div className="min-h-screen bg-background">
      <Header
        onCameraClick={handleCameraClick}
        onMenuClick={() => {}}
        isAuthenticated={isAuthenticated}
        onAuthClick={handleAuthClick}
      />

      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Search, Filter, and Controls */}
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
            {/* Filter Dropdown */}
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Badges ({badges.length})</SelectItem>
                 {isAuthenticated && <SelectItem value="own">Own ({ownedCount})</SelectItem>}
                 {isAuthenticated && <SelectItem value="want">Want ({wantedCount})</SelectItem>}
                 {isAuthenticated && <SelectItem value="available">Available</SelectItem>}
                 <SelectItem value="retired">Retired</SelectItem>
               </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 w-8 p-0"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {(isAuthenticated && canManageBadges) && (
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

        {/* Stats Bar - Clickable */}
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
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => setSelectedFilter('own')}
                  className={`bg-card border border-border rounded p-3 text-center transition-all hover:bg-muted/50 ${
                    selectedFilter === 'own' ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <div className="text-lg font-bold font-mono text-primary">
                    {stats.owned}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">OWN</div>
                </button>
                <button
                  onClick={() => setSelectedFilter('want')}
                  className={`bg-card border border-border rounded p-3 text-center transition-all hover:bg-muted/50 ${
                    selectedFilter === 'want' ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <div className="text-lg font-bold font-mono text-accent">
                    {stats.wanted}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">WANT</div>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowAuth(true)}
                  className="bg-card border border-border rounded p-3 text-center transition-all hover:bg-muted/50"
                >
                  <div className="text-lg font-bold font-mono text-muted-foreground">
                    -
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">LOGIN TO TRACK</div>
                </button>
                <button
                  onClick={() => setShowAuth(true)}
                  className="bg-card border border-border rounded p-3 text-center transition-all hover:bg-muted/50"
                >
                  <div className="text-lg font-bold font-mono text-muted-foreground">
                    -
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">LOGIN TO TRACK</div>
                </button>
              </>
            )}
            <button
              onClick={() => setSelectedFilter('all')}
              className={`bg-card border border-border rounded p-3 text-center transition-all hover:bg-muted/50 ${
                selectedFilter === 'all' ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="text-lg font-bold font-mono text-foreground">
                {stats.total}
              </div>
              <div className="text-xs text-muted-foreground font-mono">TOTAL</div>
            </button>
          </div>
        )}

        {/* Badges Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-mono font-bold text-foreground">
              Badges ({filteredBadges.length})
            </h2>
            <span className="text-sm text-muted-foreground">
              {viewMode === 'grid' ? 'Grid View' : 'Compact View'}
            </span>
          </div>
          {renderBadges(filteredBadges)}
        </div>
      </main>

      <CameraCapture
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onImageCapture={handleImageCapture}
        enableMatching={true}
        onCreateBadge={handleCreateBadgeWithPrefill}
        onAuthRequired={() => setShowAuth(true)}
      />

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
      />

      {isAuthenticated && (
        <AddBadgeModal
          isOpen={showAddBadge}
          onClose={() => {
            setShowAddBadge(false);
            setBadgePrefillData(null);
          }}
          prefillData={badgePrefillData}
        />
      )}

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <BadgeDetailModal
          badge={selectedBadge}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedBadge(null);
          }}
          isAuthenticated={isAuthenticated}
          onAuthRequired={() => setShowAuth(true)}
        />
      )}
    </div>
  );
};

export default Index;
