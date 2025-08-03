import { Badge, Heart, Star, ExternalLink, User, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
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

interface BadgeCardProps {
  badge: BadgeData;
  onOwnershipToggle?: (badgeId: string, type: 'own' | 'want') => void;
  onBadgeClick?: (badge: BadgeData) => void;
  isAuthenticated?: boolean;
}

export const BadgeCard = ({ 
  badge, 
  onOwnershipToggle, 
  onBadgeClick, 
  isAuthenticated = false 
}: BadgeCardProps) => {
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
    <Card className="badge-card group cursor-pointer" onClick={handleBadgeClick}>
      <CardHeader className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold font-mono text-foreground truncate group-hover:text-primary transition-smooth">
              {badge.name}
            </h3>
            {badge.year && (
              <span className="text-xs text-muted-foreground font-mono">
                {badge.year}
              </span>
            )}
          </div>
          {badge.externalLink && (
            <Button 
              variant="ghost" 
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-smooth"
              onClick={(e) => {
                e.stopPropagation();
                window.open(badge.externalLink, '_blank');
              }}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        {/* Stats Row */}
        {!loading && (stats.ownersCount > 0 || stats.wantsCount > 0) && (
          <div className="flex items-center gap-3 mt-2">
            {stats.ownersCount > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-mono">
                  {stats.ownersCount} owner{stats.ownersCount !== 1 ? 's' : ''}
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
                <Sparkles className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-mono">
                  {stats.wantsCount} want{stats.wantsCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-3 pt-0">
        {(() => {
          // Find primary image or use the first image or fallback to legacy image_url
          const primaryImage = (badge as any).badge_images?.find((img: any) => img.is_primary)
          const imageUrl = primaryImage?.image_url || (badge as any).badge_images?.[0]?.image_url || badge.imageUrl
          
          return imageUrl ? (
            <div className="aspect-square w-full h-20 rounded border border-border overflow-hidden bg-muted">
              <img 
                src={imageUrl} 
                alt={badge.name}
                className="w-full h-full object-contain hover:scale-105 transition-smooth"
              />
            </div>
          ) : (
            <div className="aspect-square w-full h-20 rounded border border-border bg-muted flex items-center justify-center">
              <Badge className="h-4 w-4 text-muted-foreground" />
            </div>
          )
        })()}
        
        {badge.maker && (
          <div className="flex items-center space-x-1 mt-2">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-mono truncate">
              {badge.maker}
            </span>
          </div>
        )}
        
        {badge.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {badge.description}
          </p>
        )}
        
        {badge.retired && (
          <BadgeComponent variant="destructive" className="text-xs mt-2">
            RETIRED
          </BadgeComponent>
        )}
      </CardContent>

      {isAuthenticated && (
        <CardFooter className="p-3 pt-0 flex space-x-2">
          <Button
            variant={userOwnership.isOwned ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              handleOwnershipToggle('own');
            }}
            disabled={loading}
          >
            <Star className={`h-3 w-3 ${userOwnership.isOwned ? 'fill-current' : ''}`} />
            <span className="text-xs">OWN</span>
          </Button>
          
          <Button
            variant={userOwnership.isWanted ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              handleOwnershipToggle('want');
            }}
            disabled={loading}
          >
            <Heart className={`h-3 w-3 ${userOwnership.isWanted ? 'fill-current' : ''}`} />
            <span className="text-xs">WANT</span>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};