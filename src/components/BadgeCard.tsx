import { Badge, Heart, Star, ExternalLink, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

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
  return (
    <Card className="badge-card group cursor-pointer" onClick={() => onBadgeClick?.(badge)}>
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
      </CardHeader>

      <CardContent className="p-3 pt-0">
        {badge.imageUrl ? (
          <div className="aspect-square w-full h-20 rounded border border-border overflow-hidden bg-muted">
            <img 
              src={badge.imageUrl} 
              alt={badge.name}
              className="w-full h-full object-contain hover:scale-105 transition-smooth"
            />
          </div>
        ) : (
          <div className="aspect-square w-full h-20 rounded border border-border bg-muted flex items-center justify-center">
            <Badge className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        
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
      </CardContent>

      {isAuthenticated && onOwnershipToggle && (
        <CardFooter className="p-3 pt-0 flex space-x-2">
          <Button
            variant={badge.isOwned ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onOwnershipToggle(badge.id, 'own');
            }}
          >
            <Star className={`h-3 w-3 ${badge.isOwned ? 'fill-current' : ''}`} />
            <span className="text-xs">OWN</span>
          </Button>
          
          <Button
            variant={badge.isWanted ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onOwnershipToggle(badge.id, 'want');
            }}
          >
            <Heart className={`h-3 w-3 ${badge.isWanted ? 'fill-current' : ''}`} />
            <span className="text-xs">WANT</span>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};