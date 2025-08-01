import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Plus, ExternalLink } from "lucide-react";
import { BadgeCard } from "./BadgeCard";

interface BadgeAnalysis {
  name?: string;
  year?: number;
  maker?: string;
  category?: string;
  description?: string;
  event?: string;
  confidence?: number;
  external_link?: string;
  web_info?: any;
  database_matches?: any[];
}

interface AnalysisMatch {
  badge: any;
  similarity?: number;
  confidence?: number;
}

interface BadgeAnalysisResultsProps {
  isOpen: boolean;
  imageUrl: string;
  analysis: BadgeAnalysis | null;
  matches: AnalysisMatch[];
  onClose: () => void;
  onCreateNew: (prefillData: any) => void;
}

export const BadgeAnalysisResults = ({
  isOpen,
  imageUrl,
  analysis,
  matches,
  onClose,
  onCreateNew
}: BadgeAnalysisResultsProps) => {
  const [selectedMatch, setSelectedMatch] = useState<AnalysisMatch | null>(
    matches.length > 0 ? matches[0] : null
  );

  if (!isOpen) return null;

  const handleCreateNew = () => {
    const prefillData = {
      name: analysis?.name || '',
      year: analysis?.year || new Date().getFullYear(),
      maker_id: null, // Will be set by current user
      team_name: analysis?.maker || '',
      category: analysis?.category || 'Misc',
      description: analysis?.description || '',
      external_link: analysis?.external_link || ''
    };
    onCreateNew(prefillData);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-500";
    if (confidence >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Badge Analysis Results</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side - Image and AI Analysis */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Uploaded Image</h3>
                <img
                  src={imageUrl}
                  alt="Uploaded badge"
                  className="w-full max-w-md mx-auto rounded-lg shadow-md"
                />
              </div>

              {analysis && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">AI Analysis</h3>
                  <div className="space-y-2">
                    {analysis.confidence && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Confidence:</span>
                        <Badge className={`${getConfidenceColor(analysis.confidence)} text-white`}>
                          {analysis.confidence}%
                        </Badge>
                      </div>
                    )}
                    
                    {analysis.name && (
                      <div>
                        <span className="text-sm font-medium">Name:</span>
                        <span className="ml-2">{analysis.name}</span>
                      </div>
                    )}
                    
                    {analysis.maker && (
                      <div>
                        <span className="text-sm font-medium">Maker:</span>
                        <span className="ml-2">{analysis.maker}</span>
                      </div>
                    )}
                    
                    {analysis.year && (
                      <div>
                        <span className="text-sm font-medium">Year:</span>
                        <span className="ml-2">{analysis.year}</span>
                      </div>
                    )}
                    
                    {analysis.category && (
                      <div>
                        <span className="text-sm font-medium">Category:</span>
                        <span className="ml-2">{analysis.category}</span>
                      </div>
                    )}
                    
                    {analysis.event && (
                      <div>
                        <span className="text-sm font-medium">Event:</span>
                        <span className="ml-2">{analysis.event}</span>
                      </div>
                    )}
                    
                    {analysis.description && (
                      <div>
                        <span className="text-sm font-medium">Description:</span>
                        <p className="ml-2 text-sm text-muted-foreground">
                          {analysis.description}
                        </p>
                      </div>
                    )}
                    
                    {analysis.external_link && (
                      <div>
                        <a
                          href={analysis.external_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700"
                        >
                          <ExternalLink className="h-3 w-3" />
                          More Info
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Side - Database Matches */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Database Matches</h3>
              
              {matches.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No matches found in our database.
                  </p>
                  <Button onClick={handleCreateNew} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add New Badge
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Found {matches.length} potential match{matches.length !== 1 ? 'es' : ''}:
                  </p>
                  
                  {matches.map((match, index) => (
                    <div
                      key={match.badge.id}
                      className={`cursor-pointer rounded-lg border-2 transition-colors ${
                        selectedMatch?.badge.id === match.badge.id
                          ? 'border-primary'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                      onClick={() => setSelectedMatch(match)}
                    >
                      <BadgeCard
                        badge={{
                          id: match.badge.id,
                          name: match.badge.name,
                          year: match.badge.year || undefined,
                          maker: match.badge.profiles?.display_name || undefined,
                          description: match.badge.description || undefined,
                          imageUrl: match.badge.image_url || undefined,
                          externalLink: match.badge.external_link || undefined,
                          isOwned: false,
                          isWanted: false,
                          retired: match.badge.retired,
                        }}
                        onOwnershipToggle={() => {}}
                        onBadgeClick={() => {}}
                        isAuthenticated={false}
                      />
                      {match.confidence && (
                        <div className="px-4 pb-2">
                          <Badge className={`${getConfidenceColor(match.confidence)} text-white text-xs`}>
                            {match.confidence}% match
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleCreateNew}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add as New Badge
                    </Button>
                    {selectedMatch && (
                      <Button onClick={onClose}>
                        This is the Badge
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};