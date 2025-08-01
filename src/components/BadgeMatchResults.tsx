import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ExternalLink } from "lucide-react";

interface BadgeMatch {
  badge: {
    id: string;
    name: string;
    maker_id: string | null;
    image_url: string | null;
    description: string | null;
    year: number | null;
    category: string | null;
    profiles?: {
      display_name: string | null;
    } | null;
  };
  similarity: number;
  confidence: number;
}

interface BadgeMatchResultsProps {
  matches: BadgeMatch[];
  isOpen: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  onConfirmMatch?: (badgeId: string, similarity: number, confidence: number) => void;
}

export const BadgeMatchResults = ({ 
  matches, 
  isOpen, 
  onClose, 
  onCreateNew,
  onConfirmMatch 
}: BadgeMatchResultsProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg font-mono">BADGE MATCHES</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4 overflow-y-auto">
          {matches.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <div className="p-4 rounded-full bg-muted w-fit mx-auto">
                <svg className="h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.034 0-3.9.785-5.291 2.09M6.343 6.343A8 8 0 1017.657 17.657 8 8 0 006.343 6.343z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold font-mono">NO MATCHES FOUND</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  We couldn't find any similar badges in our database.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  This might be a new badge! Want to add it?
                </p>
              </div>
              <Button 
                onClick={onCreateNew} 
                variant="matrix" 
                className="mt-4"
              >
                CREATE NEW BADGE
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground font-mono">
                  Found {matches.length} similar badge{matches.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div className="space-y-3">
                {matches.map((match, index) => (
                  <Card key={match.badge.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex space-x-4">
                        {match.badge.image_url && (
                          <div className="flex-shrink-0">
                            <img
                              src={match.badge.image_url}
                              alt={match.badge.name}
                              className="w-20 h-20 object-cover rounded-lg border"
                            />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg font-mono truncate">
                                {match.badge.name}
                              </h3>
                              {match.badge.profiles?.display_name && (
                                <p className="text-sm text-muted-foreground">
                                  Created By: {match.badge.profiles.display_name}
                                </p>
                              )}
                            </div>
                            <Badge 
                              variant="outline" 
                              className="ml-2 flex-shrink-0 text-xs font-mono"
                            >
                              {match.confidence}% Match
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {match.badge.year && (
                              <span className="font-mono">{match.badge.year}</span>
                            )}
                            {match.badge.category && (
                              <Badge variant="secondary" className="text-xs">
                                {match.badge.category}
                              </Badge>
                            )}
                          </div>
                          
                          {match.badge.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {match.badge.description}
                            </p>
                          )}
                          
                          {onConfirmMatch && (
                            <div className="flex space-x-2 mt-3">
                              <Button 
                                size="sm" 
                                variant="matrix"
                                onClick={() => {
                                  onConfirmMatch(match.badge.id, match.similarity, match.confidence);
                                  onClose();
                                }}
                                className="text-xs"
                              >
                                ✓ YES, THIS IS IT
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={onClose}
                                className="text-xs"
                              >
                                Not quite
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="flex space-x-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={onCreateNew}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  CREATE NEW BADGE
                </Button>
                <Button 
                  variant="matrix" 
                  className="flex-1"
                  onClick={onClose}
                >
                  CLOSE
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};