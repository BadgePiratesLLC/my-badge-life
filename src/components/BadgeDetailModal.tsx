import { useState } from "react";
import { Badge, Heart, Star, ExternalLink, User, Calendar, Tag, MapPin, Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge as BadgeComponent } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import { useEffect } from "react";

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
  category?: string;
  teamName?: string;
  profiles?: { display_name: string }[];
}

interface BadgeDetailModalProps {
  badge: BadgeData | null;
  isOpen: boolean;
  onClose: () => void;
  onOwnershipToggle?: (badgeId: string, type: 'own' | 'want') => void;
  isAuthenticated?: boolean;
}

export const BadgeDetailModal = ({ 
  badge, 
  isOpen, 
  onClose, 
  onOwnershipToggle, 
  isAuthenticated = false 
}: BadgeDetailModalProps) => {
  const { trackBadgeInteraction } = useAnalyticsTracking();

  // Track detail view when modal opens
  useEffect(() => {
    if (isOpen && badge) {
      trackBadgeInteraction(badge.id, 'detail_view');
    }
  }, [isOpen, badge?.id]);

  if (!badge) return null;

  const makerName = badge.profiles?.[0]?.display_name || badge.maker;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-bold font-mono text-foreground">
            {badge.name}
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Badge Image */}
          <Card>
            <CardContent className="p-6">
              {badge.imageUrl ? (
                <div className="w-full max-w-md mx-auto">
                  <img 
                    src={badge.imageUrl} 
                    alt={badge.name}
                    className="w-full h-auto rounded-lg border border-border bg-muted"
                  />
                </div>
              ) : (
                <div className="w-full max-w-md mx-auto aspect-square rounded-lg border border-border bg-muted flex items-center justify-center">
                  <Badge className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Badge Status */}
          <div className="flex items-center space-x-2">
            {badge.retired && (
              <BadgeComponent variant="destructive">
                RETIRED
              </BadgeComponent>
            )}
            {badge.category && (
              <BadgeComponent variant="secondary">
                {badge.category}
              </BadgeComponent>
            )}
          </div>

          {/* Badge Details */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {badge.year && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Year:</span>
                    <span className="text-sm font-mono">{badge.year}</span>
                  </div>
                )}

                {makerName && (
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Maker:</span>
                    <span className="text-sm font-mono">{makerName}</span>
                  </div>
                )}

                {badge.teamName && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Team:</span>
                    <span className="text-sm font-mono">{badge.teamName}</span>
                  </div>
                )}

                {badge.category && (
                  <div className="flex items-center space-x-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Category:</span>
                    <span className="text-sm font-mono">{badge.category}</span>
                  </div>
                )}
              </div>

              {badge.description && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {badge.description}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            {badge.externalLink && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => window.open(badge.externalLink, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Original Source
              </Button>
            )}

            {isAuthenticated && onOwnershipToggle && (
              <>
                <Button
                  variant={badge.isOwned ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => onOwnershipToggle(badge.id, 'own')}
                >
                  <Star className={`h-4 w-4 mr-2 ${badge.isOwned ? 'fill-current' : ''}`} />
                  {badge.isOwned ? 'Owned' : 'Mark as Owned'}
                </Button>
                
                <Button
                  variant={badge.isWanted ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => onOwnershipToggle(badge.id, 'want')}
                >
                  <Heart className={`h-4 w-4 mr-2 ${badge.isWanted ? 'fill-current' : ''}`} />
                  {badge.isWanted ? 'Wanted' : 'Add to Wishlist'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};