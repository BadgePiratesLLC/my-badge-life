import { Badge, Heart, Star, ExternalLink, User, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge as BadgeComponent } from "@/components/ui/badge";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import { useBadgeStats } from "@/hooks/useBadgeStats";

interface BadgeData {
  id: string;
  name: string;
  year?: number;
  maker?: string;
  description?: string;
  imageUrl?: string;
  externalLink?: string;
  isOwned?: boolean;
  isWanted?: boolean;
  retired?: boolean;
}

interface BadgeListItemProps {
  badge: BadgeData;
  onOwnershipToggle?: (badgeId: string, type: 'own' | 'want') => void;
  onBadgeClick?: (badge: BadgeData) => void;
  isAuthenticated?: boolean;
}

export const BadgeListItem = ({ 
  badge, 
  onOwnershipToggle, 
  onBadgeClick, 
  isAuthenticated = false 
}: BadgeListItemProps) => {
  const { trackBadgeInteraction } = useAnalyticsTracking();
  const { stats, userOwnership, loading, toggleOwnership } = useBadgeStats(badge.id);

  const handleBadgeClick = async () => {
    await trackBadgeInteraction(badge.id, 'view');
    onBadgeClick?.(badge);
  };

  const handleOwnershipToggle = async (type: 'own' | 'want') => {
    await trackBadgeInteraction(badge.id, 'ownership_toggle');
    await toggleOwnership(type);
    onOwnershipToggle?.(badge.id, type);
  };

  const formatRank = (rank: number | null) => {
    if (!rank) return '';
    const suffix = rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th';
    return `#${rank}${suffix}`;
  };

  return (
    <div className="group flex items-center p-3 border border-border rounded-lg bg-card hover:bg-muted/50 transition-all duration-200 cursor-pointer animate-fade-in" onClick={handleBadgeClick}>
      {/* Badge Image */}
      <div className="flex-shrink-0 w-12 h-12 rounded border border-border overflow-hidden bg-muted mr-3">
        {badge.imageUrl ? (
          <img 
            src={badge.imageUrl} 
            alt={badge.name}
            className="w-full h-full object-contain hover-scale"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Badge className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Badge Info */}
      <div className="flex-1 min-w-0 mr-3">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold font-mono text-foreground truncate group-hover:text-primary transition-smooth">
            {badge.name}
          </h3>
          {badge.year && (
            <span className="text-xs text-muted-foreground font-mono bg-muted px-1 py-0.5 rounded">
              {badge.year}
            </span>
          )}
          {badge.retired && (
            <BadgeComponent variant="destructive" className="text-xs">
              RETIRED
            </BadgeComponent>
          )}
          {badge.externalLink && (
            <Button 
              variant="ghost" 
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-smooth"
              onClick={(e) => {
                e.stopPropagation();
                window.open(badge.externalLink, '_blank');
              }}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {badge.maker && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="font-mono truncate max-w-24">{badge.maker}</span>
            </div>
          )}
          
          {/* Stats */}
          {!loading && (
            <>
              {stats.ownersCount > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span className="font-mono">
                    {stats.ownersCount}
                    {stats.ownershipRank && (
                      <span className="text-primary ml-1">
                        ({formatRank(stats.ownershipRank)})
                      </span>
                    )}
                  </span>
                </div>
              )}
              {stats.wantsCount > 0 && (
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  <span className="font-mono">{stats.wantsCount}</span>
                </div>
              )}
            </>
          )}
        </div>
        
        {badge.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {badge.description}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      {isAuthenticated && (
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant={userOwnership.isOwned ? "default" : "outline"}
            size="sm"
            className="h-7 px-3 border-2"
            onClick={(e) => {
              e.stopPropagation();
              handleOwnershipToggle('own');
            }}
            disabled={loading}
          >
            <Star className={`h-3 w-3 mr-1 ${userOwnership.isOwned ? 'fill-current' : ''}`} />
            <span className="text-xs">OWN</span>
          </Button>
          
          <Button
            variant={userOwnership.isWanted ? "default" : "outline"}
            size="sm"
            className="h-7 px-3"
            onClick={(e) => {
              e.stopPropagation();
              handleOwnershipToggle('want');
            }}
            disabled={loading}
          >
            <Heart className={`h-3 w-3 mr-1 ${userOwnership.isWanted ? 'fill-current' : ''}`} />
            <span className="text-xs">WANT</span>
          </Button>
        </div>
      )}
    </div>
  );
};