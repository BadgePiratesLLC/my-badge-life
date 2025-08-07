import { useState, useRef } from "react";
import { Camera, Upload, X, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BadgeAnalysisResults } from "./BadgeAnalysisResults";
import { useBadgeConfirmations } from "@/hooks/useBadgeConfirmations";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import { Switch } from "@/components/ui/switch";

interface CameraCaptureProps {
  onImageCapture: (file: File) => void;
  onClose: () => void;
  isOpen: boolean;
  enableMatching?: boolean;
  onCreateBadge?: (prefillData: any) => void;
  onAuthRequired?: () => void; // Callback to show auth modal
}

export const CameraCapture = ({ 
  onImageCapture, 
  onClose, 
  isOpen, 
  enableMatching = false,
  onCreateBadge,
  onAuthRequired 
}: CameraCaptureProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { confirmMatch } = useBadgeConfirmations();
  const { trackSearch } = useAnalyticsTracking();
  const [debugMode, setDebugMode] = useState(false);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (file.type.startsWith('image/')) {
      console.log('CameraCapture handleFile - enableMatching:', enableMatching);
      if (enableMatching) {
        console.log('Starting image analysis...');
        await handleImageAnalysis(file);
      } else {
        console.log('Just uploading image...');
        onImageCapture(file);
        onClose();
      }
    }
  };

  const handleImageAnalysis = async (file: File) => {
    setIsAnalyzing(true);
    const startTime = Date.now();
    
    try {
      // Create image URL for preview
      const imageUrl = URL.createObjectURL(file);
      setUploadedImageUrl(imageUrl);
      
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        try {
          console.log('Starting badge matching analysis...');
          console.log('Image size:', file.size, 'bytes');
          console.log('Base64 length:', base64?.length);
          
          // Step 1: Badge matching search
          const { data, error } = await supabase.functions.invoke('match-badge-image', {
            body: { imageBase64: base64, debug: debugMode }
          });

          console.log('Function response:', { data, error });

          if (error) {
            console.error('Function invocation error:', error);
            throw error;
          }

          // No additional searches needed - analyze-badge-image handles everything

          const endTime = Date.now();
          const totalDuration = endTime - startTime;

          // Track search analytics (with error handling)
          try {
            const matchCount = data.matches?.length || 0;
            const bestConfidence = matchCount > 0 ? Math.max(...data.matches.map((m: any) => m.confidence || 0)) : 0;
            
            await trackSearch({
              searchType: 'image_upload',
              totalDuration,
              resultsFound: matchCount,
              bestConfidenceScore: bestConfidence,
              searchSourceUsed: data.analysis?.search_source || 'local_database',
              foundInDatabase: matchCount > 0,
              foundViaWebSearch: data.analysis?.search_source?.includes('Google'),
              foundViaImageMatching: data.analysis?.search_source === 'image_matching'
            });
          } catch (trackingError) {
            console.warn('Analytics tracking failed, continuing anyway:', trackingError);
          }

          setAnalysisResults({...data, originalImageBase64: base64, originalFile: file});
          setShowAnalysis(true);
          setIsAnalyzing(false);
        } catch (analysisError) {
          console.error('Error analyzing badge:', analysisError);
          console.error('Error details:', {
            message: analysisError.message,
            name: analysisError.name,
            stack: analysisError.stack
          });
          
          // Track failed search (with error handling)
          try {
            const endTime = Date.now();
            const totalDuration = endTime - startTime;
            await trackSearch({
              searchType: 'image_upload',
              totalDuration,
              resultsFound: 0,
              foundInDatabase: false,
              foundViaWebSearch: false,
              foundViaImageMatching: false
            });
          } catch (trackingError) {
            console.warn('Analytics tracking failed:', trackingError);
          }
          
          toast({
            title: "Analysis Failed",
            description: "Could not analyze the badge. Try creating a new one.",
            variant: "destructive"
          });
          setIsAnalyzing(false);
          // Fallback to regular creation
          onImageCapture(file);
          onClose();
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image:', error);
      setIsAnalyzing(false);
      
      // Track failed search (with error handling)
      try {
        const endTime = Date.now();
        const totalDuration = endTime - startTime;
        await trackSearch({
          searchType: 'image_upload',
          totalDuration,
          resultsFound: 0,
          foundInDatabase: false,
          foundViaWebSearch: false,
          foundViaImageMatching: false
        });
      } catch (trackingError) {
        console.warn('Analytics tracking failed:', trackingError);
      }
      
      toast({
        title: "Error",
        description: "Could not process the image",
        variant: "destructive"
      });
    }
  };

  const handleCreateNew = (prefillData: any) => {
    setShowAnalysis(false);
    // Include the original file for proper upload
    const enhancedPrefillData = {
      ...prefillData,
      imageFile: analysisResults?.originalFile // Pass the original file
    };
    onCreateBadge?.(enhancedPrefillData);
    onClose();
  };

  const handleCloseAnalysis = () => {
    setShowAnalysis(false);
    setAnalysisResults(null);
    setUploadedImageUrl('');
    setIsAnalyzing(false);
    // Reset file input to allow re-scanning
    if (uploadInputRef.current) {
      uploadInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const handleRetrySearch = async () => {
    if (!analysisResults?.originalFile) {
      toast({
        title: "Cannot retry search",
        description: "Original image data not available",
        variant: "destructive"
      });
      return;
    }
    
    // Clear all previous results
    setAnalysisResults(null);
    setShowAnalysis(false);
    
    // Re-analyze the same image
    await handleImageAnalysis(analysisResults.originalFile);
  };

  const triggerUploadInput = () => {
    uploadInputRef.current?.click();
  };

  const triggerCameraInput = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg font-mono">SCAN BADGE</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-smooth ${
              dragActive 
                ? "border-primary bg-primary/10" 
                : "border-border hover:border-primary/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium font-mono">
                  Drop badge photo here
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  or click to browse
                </p>
              </div>
            </div>
            
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="flex-1"
               onClick={triggerUploadInput}
              disabled={isAnalyzing}
            >
              <Upload className="h-4 w-4" />
              UPLOAD
            </Button>
            
            <Button
              variant="matrix"
              className="flex-1"
               onClick={triggerCameraInput}
              disabled={isAnalyzing}
            >
              <Camera className="h-4 w-4" />
              CAMERA
            </Button>
          </div>
          
          {enableMatching && (
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={triggerUploadInput}
                disabled={isAnalyzing}
              >
                <Search className="h-4 w-4" />
                {isAnalyzing ? "ANALYZING..." : "FIND SIMILAR"}
              </Button>
            </div>
          )}
          
          {/* Debug toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Debug AI matching</span>
            <Switch checked={debugMode} onCheckedChange={setDebugMode} />
          </div>
          
          <p className="text-xs text-muted-foreground text-center font-mono">
            {enableMatching 
              ? "CAPTURE TO SEARCH FOR SIMILAR BADGES OR CREATE NEW"
              : "CAPTURE CLEAR PHOTOS FOR BEST IDENTIFICATION"
            }
          </p>
          
          {isAnalyzing && (
            <div className="flex items-center justify-center space-x-2 py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-xs font-mono text-muted-foreground">
                ANALYZING IMAGE...
              </span>
            </div>
          )}
        </CardContent>
      </Card>
      
        <BadgeAnalysisResults
          isOpen={showAnalysis}
          imageUrl={uploadedImageUrl}
          analysis={analysisResults?.analysis}
          matches={analysisResults?.matches || []}
          onClose={handleCloseAnalysis}
          onCreateNew={handleCreateNew}
          originalImageBase64={analysisResults?.originalImageBase64}
          canAddToDatabase={analysisResults?.canAddToDatabase}
          onConfirmMatch={enableMatching ? confirmMatch : undefined}
          onAuthRequired={onAuthRequired}
          onRetrySearch={handleRetrySearch}
          debugInfo={analysisResults?.debug}
        />
    </div>
  );
};