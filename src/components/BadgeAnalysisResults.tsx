import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Plus, ExternalLink, Search } from "lucide-react";
import { BadgeCard } from "./BadgeCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAIFeedback } from "@/hooks/useAIFeedback";
import { useAuth } from "@/hooks/useAuth";

interface BadgeAnalysis {
  name?: string;
  year?: number;
  maker?: string;
  category?: string;
  description?: string;
  event?: string;
  confidence?: number;
  external_link?: string;
  url?: string; // Alternative to external_link
  image_url?: string; // Image URL from web search
  source?: string; // Source of the analysis (Tindie, Hackaday, etc.)
  search_source?: string; // Source of the search
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
  originalImageBase64?: string; // For web search
  canAddToDatabase?: boolean; // For admin to add high-confidence results
  onConfirmMatch?: (badgeId: string, similarity: number, confidence: number) => void;
  onAuthRequired?: () => void; // Callback to show auth modal
  onRetrySearch?: () => void; // Callback to trigger a complete retry from parent
}

export const BadgeAnalysisResults = ({
  isOpen,
  imageUrl,
  analysis,
  matches,
  onClose,
  onCreateNew,
  originalImageBase64,
  canAddToDatabase,
  onConfirmMatch,
  onAuthRequired,
  onRetrySearch
}: BadgeAnalysisResultsProps) => {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const { submitFeedback, isSubmitting: feedbackSubmitting } = useAIFeedback();
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [webSearchResults, setWebSearchResults] = useState<any>(null);
  const [isAddingToDatabase, setIsAddingToDatabase] = useState(false);
  
  // Filter matches to show only the highest confidence, or tied matches
  const filteredMatches = matches.length > 0 ? (() => {
    const topConfidence = matches[0].confidence;
    return matches.filter(match => match.confidence === topConfidence);
  })() : [];

  const [selectedMatch, setSelectedMatch] = useState<AnalysisMatch | null>(
    filteredMatches.length > 0 ? filteredMatches[0] : null
  );
  const [hideDatabaseMatches, setHideDatabaseMatches] = useState(false);

  if (!isOpen) return null;

  const handleSearchWeb = async () => {
    if (!originalImageBase64) {
      toast({
        title: "Cannot search web",
        description: "Original image data not available",
        variant: "destructive"
      });
      return;
    }
    
    setIsSearchingWeb(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-badge-image', {
        body: { 
          imageBase64: originalImageBase64,
          forceWebSearch: true // Force web search
        }
      });

      if (error) throw error;
      
      setWebSearchResults(data.analysis);
      toast({
        title: "Web search completed",
        description: "Found additional information from the internet"
      });
    } catch (error) {
      console.error('Web search error:', error);
      toast({
        title: "Web search failed", 
        description: "Could not search for badge information online",
        variant: "destructive"
      });
    } finally {
      setIsSearchingWeb(false);
    }
  };

  const handleAddToDatabase = async () => {
    if (!analysis || !canAddToDatabase) return;
    
    setIsAddingToDatabase(true);
    try {
      const badgeData = {
        name: analysis.name || 'Unknown Badge',
        description: analysis.description || '',
        year: analysis.year || new Date().getFullYear(),
        category: analysis.category || 'Misc',
        external_link: analysis.url || analysis.external_link || '',
        image_url: imageUrl, // Use the uploaded image
        maker_id: null // Will be set by admin
      };
      
      // This would typically call an admin-only endpoint to create the badge
      // For now, just call the regular createBadge function
      onCreateNew(badgeData);
      
      toast({
        title: "Badge added to database",
        description: `${analysis.name} has been added from ${analysis.source || 'web search'} results`
      });
      
    } catch (error) {
      console.error('Error adding badge to database:', error);
      toast({
        title: "Failed to add badge",
        description: "Could not add badge to database",
        variant: "destructive"
      });
    } finally {
      setIsAddingToDatabase(false);
    }
  };

  const handleCreateNew = () => {
    if (!isAuthenticated) {
      if (onAuthRequired) {
        onAuthRequired();
      } else {
        toast({
          title: "Login Required",
          description: "Please login to add badges to the database."
        });
      }
      return;
    }

    const prefillData = {
      name: webSearchResults?.name || analysis?.name || '',
      year: webSearchResults?.year || analysis?.year || new Date().getFullYear(),
      maker_id: null, // Will be set by current user
      team_name: webSearchResults?.maker || analysis?.maker || '',
      category: webSearchResults?.category || analysis?.category || 'Misc',
      description: webSearchResults?.description || analysis?.description || '',
      external_link: webSearchResults?.external_link || webSearchResults?.url || analysis?.external_link || '',
      // Only use web search image if it's a valid HTTP/HTTPS URL, otherwise use uploaded image
      image_url: ((webSearchResults?.image_url || analysis?.image_url) && 
                 ((webSearchResults?.image_url || analysis?.image_url).startsWith('http://') || 
                  (webSearchResults?.image_url || analysis?.image_url).startsWith('https://'))) 
                ? (webSearchResults?.image_url || analysis?.image_url) 
                : imageUrl
    };
    onCreateNew(prefillData);
  };

  const handleAIFeedback = async (feedbackType: 'helpful' | 'not_helpful' | 'incorrect' | 'spam') => {
    const searchQuery = analysis?.name || 'Unknown Badge';
    const sourceUrl = webSearchResults?.url || webSearchResults?.external_link || analysis?.external_link;
    const aiResult = webSearchResults || analysis;
    
    await submitFeedback(searchQuery, aiResult, feedbackType, sourceUrl);
  };

  const handleForceAISearch = async () => {
    if (!originalImageBase64) {
      toast({
        title: "Cannot search",
        description: "Original image data not available",
        variant: "destructive"
      });
      return;
    }
    
    setIsSearchingWeb(true);
    try {
      // Step 1: Try Google search first
      toast({
        title: "Searching...",
        description: "Starting Google search for badge information"
      });
      
      const { data: googleData, error: googleError } = await supabase.functions.invoke('google-badge-search', {
        body: { imageBase64: originalImageBase64 }
      });

      if (googleError) throw googleError;
      
      // If Google search found good results (60%+ confidence), use them
      if (googleData?.analysis && googleData.analysis.confidence >= 60) {
        setHideDatabaseMatches(true);
        setWebSearchResults(googleData.analysis);
        
        toast({
          title: "Google search completed",
          description: `Found: ${googleData.analysis.name} (${googleData.analysis.confidence}% confidence)`
        });
        return;
      }
      
      // Step 2: If Google search didn't find good results, try AI analysis
      toast({
        title: "Trying AI analysis...",
        description: "Google search insufficient, running AI analysis as fallback"
      });
      
      const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-badge-analysis', {
        body: { imageBase64: originalImageBase64 }
      });

      if (aiError) throw aiError;
      
      // Hide database results and show AI results
      setHideDatabaseMatches(true);
      setWebSearchResults(aiData.analysis);
      
      toast({
        title: "AI analysis completed",
        description: `AI identified: ${aiData.analysis.name} (${aiData.analysis.confidence}% confidence)`
      });
      
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed", 
        description: "Could not search for badge information",
        variant: "destructive"
      });
    } finally {
      setIsSearchingWeb(false);
    }
  };

  const handleRetrySearch = () => {
    if (onRetrySearch) {
      // Use parent's retry function to completely restart the search
      onRetrySearch();
    } else {
      // Fallback to local retry if parent doesn't provide retry function
      handleLocalRetry();
    }
  };

  const handleLocalRetry = async () => {
    if (!originalImageBase64) {
      toast({
        title: "Cannot retry search",
        description: "Original image data not available",
        variant: "destructive"
      });
      return;
    }
    
    // Clear previous results
    setWebSearchResults(null);
    setHideDatabaseMatches(false);
    
    setIsSearchingWeb(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-badge-image', {
        body: { 
          imageBase64: originalImageBase64,
          forceWebSearch: true,
          retryCount: Math.floor(Math.random() * 3) + 1 // Add some randomness to retry
        }
      });

      if (error) throw error;
      
      setWebSearchResults(data.analysis);
      toast({
        title: "Retry search completed",
        description: "Found new badge information"
      });
    } catch (error) {
      console.error('Retry search error:', error);
      toast({
        title: "Retry search failed", 
        description: "Could not find alternative badge information",
        variant: "destructive"
      });
    } finally {
      setIsSearchingWeb(false);
    }
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

              {/* Only show AI analysis if we actually performed a web search or have results */}
              {(webSearchResults || (analysis && analysis.search_source && analysis.search_source !== 'none')) && (
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    {webSearchResults ? "Web Search Results" : "AI Analysis"}
                    {analysis?.search_source && analysis.search_source !== 'none' && (
                      <Badge variant="secondary" className="text-xs">
                        Found on {analysis.search_source}
                      </Badge>
                    )}
                  </h3>
                  <div className="space-y-2">
                    {(webSearchResults || analysis).confidence && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Confidence:</span>
                        <Badge className={`${getConfidenceColor((webSearchResults || analysis).confidence)} text-white`}>
                          {(webSearchResults || analysis).confidence}%
                        </Badge>
                      </div>
                    )}
                    
                    {(webSearchResults?.name || analysis?.name) && (
                      <div>
                        <span className="text-sm font-medium">Name:</span>
                        <span className="ml-2">{webSearchResults?.name || analysis.name}</span>
                      </div>
                    )}
                    
                    {(webSearchResults?.maker || analysis?.maker) && (
                      <div>
                        <span className="text-sm font-medium">Maker:</span>
                        <span className="ml-2">{webSearchResults?.maker || analysis.maker}</span>
                      </div>
                    )}
                    
                    {(webSearchResults?.year || analysis?.year) && (
                      <div>
                        <span className="text-sm font-medium">Year:</span>
                        <span className="ml-2">{webSearchResults?.year || analysis.year}</span>
                      </div>
                    )}
                    
                    {(webSearchResults?.category || analysis?.category) && (
                      <div>
                        <span className="text-sm font-medium">Category:</span>
                        <span className="ml-2">{webSearchResults?.category || analysis.category}</span>
                      </div>
                    )}
                    
                    {(webSearchResults?.event || analysis?.event) && (
                      <div>
                        <span className="text-sm font-medium">Event:</span>
                        <span className="ml-2">{webSearchResults?.event || analysis.event}</span>
                      </div>
                    )}
                     {/* Source Information - always show for web search results */}
                     {(webSearchResults || (analysis?.search_source && analysis.search_source !== 'none')) && (
                       <div className="border-t pt-2 mt-2">
                         {(webSearchResults?.external_link || webSearchResults?.url || analysis?.external_link) ? (
                           <div>
                             <span className="text-sm font-medium">Source:</span>
                             <a 
                               href={webSearchResults?.external_link || webSearchResults?.url || analysis?.external_link} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="ml-2 text-primary hover:text-primary/80 underline text-sm"
                             >
                               {webSearchResults?.source || analysis?.search_source || 'View Original Source'}
                             </a>
                           </div>
                         ) : (
                           <div className="text-sm text-muted-foreground">
                             <span className="font-medium">Source:</span>
                             <span className="ml-2">No specific source found - this is an AI-generated guess based on image analysis</span>
                           </div>
                         )}
                       </div>
                     )}
                    
                    {(webSearchResults?.description || analysis?.description) && (
                      <div>
                        <span className="text-sm font-medium">Description:</span>
                        <p className="ml-2 text-sm text-muted-foreground">
                          {webSearchResults?.description || analysis.description}
                        </p>
                      </div>
                     )}
                     
                     {/* AI Feedback Section - only show if we actually did AI search */}
                     {(webSearchResults || (analysis?.search_source && analysis.search_source !== 'none')) && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2">Rate this AI search result:</p>
                        <div className="flex gap-2 flex-wrap">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleAIFeedback('helpful')}
                            disabled={feedbackSubmitting}
                            className="text-green-600 hover:text-green-700"
                          >
                            👍 Helpful
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleAIFeedback('not_helpful')}
                            disabled={feedbackSubmitting}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            👎 Not Helpful
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleAIFeedback('incorrect')}
                            disabled={feedbackSubmitting}
                            className="text-red-600 hover:text-red-700"
                          >
                            ❌ Incorrect
                          </Button>
                           <Button 
                             size="sm" 
                             variant="destructive"
                             onClick={handleRetrySearch}
                             disabled={isSearchingWeb}
                             className="gap-2"
                           >
                             <Search className="h-4 w-4" />
                             {isSearchingWeb ? "Searching..." : "This is completely wrong - Try again"}
                           </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Side - Database Matches */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Database Matches</h3>
              
              {(filteredMatches.length === 0 || hideDatabaseMatches) ? (
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
                    {filteredMatches.length === 1 
                      ? `Found best match:` 
                      : `Found ${filteredMatches.length} matches with same confidence:`
                    }
                  </p>
                  
                  {filteredMatches.map((match, index) => (
                    <div
                      key={match.badge.id}
                      className={`rounded-lg border-2 transition-colors ${
                        selectedMatch?.badge.id === match.badge.id
                          ? 'border-primary'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <div onClick={() => setSelectedMatch(match)} className="cursor-pointer">
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
                      </div>
                      
                      <div className="px-4 pb-4 space-y-2">
                        {match.confidence && (
                          <div className="flex items-center justify-between">
                            <Badge className={`${getConfidenceColor(match.confidence)} text-white text-xs`}>
                              {match.confidence}% match
                            </Badge>
                          </div>
                        )}
                        
                         {/* Show confirmation button for each match */}
                         {onConfirmMatch && (
                           <div className="space-y-2">
                             <Button 
                               onClick={() => {
                                 onConfirmMatch(
                                   match.badge.id, 
                                   match.similarity || 0,
                                   match.confidence || 0
                                 );
                                 onClose();
                               }} 
                               className="w-full bg-green-600 hover:bg-green-700"
                               size="sm"
                             >
                               ✓ YES, THIS IS IT
                             </Button>
                             
                             <Button
                               onClick={handleForceAISearch}
                               variant="destructive"
                               size="sm"
                               className="w-full"
                               disabled={isSearchingWeb}
                             >
                               {isSearchingWeb ? "Searching..." : "✗ NO, NOT IT - Search AI"}
                             </Button>
                           </div>
                         )}
                      </div>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      variant="outline" 
                      onClick={handleCreateNew}
                      className="gap-2 flex-1"
                    >
                      <Plus className="h-4 w-4" />
                      Add as New Badge
                    </Button>
                    {/* Remove the selected match confirmation button since it's now on each card */}
                    {originalImageBase64 && (
                      <Button 
                        variant="secondary"
                        onClick={handleSearchWeb}
                        disabled={isSearchingWeb}
                        className="gap-2"
                      >
                        <Search className="h-4 w-4" />
                        {isSearchingWeb ? "Searching..." : "Search Web"}
                      </Button>
                    )}
                    {canAddToDatabase && analysis?.search_source && analysis.search_source !== 'none' && (
                      <Button 
                        variant="default"
                        onClick={handleAddToDatabase}
                        disabled={isAddingToDatabase}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        {isAddingToDatabase ? "Adding..." : `Add from ${analysis.search_source}`}
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