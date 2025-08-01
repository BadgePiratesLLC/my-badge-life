import { useState } from "react";
import { BadgeCard } from "@/components/BadgeCard";
import { BadgeDetailModal } from "@/components/BadgeDetailModal";
import { Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBadges } from "@/hooks/useBadges";
import { useToast } from "@/hooks/use-toast";

interface BadgeExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
}

export const BadgeExplorer = ({ isOpen, onClose, onSignIn }: BadgeExplorerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBadge, setSelectedBadge] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { badges, loading: badgesLoading } = useBadges();
  const { toast } = useToast();

  if (!isOpen) return null;

  // Filter badges based on search
  const filteredBadges = badges.filter(badge => {
    const matchesSearch = badge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      badge.profiles?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      badge.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleOwnershipToggle = () => {
    // For unauthenticated users, prompt to sign in
    toast({
      title: "Sign In Required",
      description: "Please sign in to track badges in your collection.",
    });
    onSignIn();
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-mono font-bold text-foreground">EXPLORE COLLECTION</h1>
              <p className="text-sm text-muted-foreground">Browse all badges in the database</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Search */}
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
          <Button variant="matrix" onClick={onSignIn}>
            SIGN IN TO TRACK
          </Button>
        </div>

        {/* Stats */}
        <div className="bg-card border border-border rounded p-4 text-center">
          <div className="text-2xl font-bold font-mono text-primary">
            {filteredBadges.length}
          </div>
          <div className="text-sm text-muted-foreground font-mono">
            {searchQuery ? 'BADGES FOUND' : 'TOTAL BADGES'}
          </div>
        </div>

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
        ) : filteredBadges.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-lg">
            <p className="text-muted-foreground font-mono text-sm">
              {searchQuery ? "No badges found matching your search." : "No badges available."}
            </p>
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
                  isOwned: false,
                  isWanted: false,
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
                isAuthenticated={false}
              />
            ))}
          </div>
        )}
      </main>

      {/* Badge Detail Modal */}
      <BadgeDetailModal
        badge={selectedBadge}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedBadge(null);
        }}
        onOwnershipToggle={handleOwnershipToggle}
        isAuthenticated={false}
      />
    </div>
  );
};