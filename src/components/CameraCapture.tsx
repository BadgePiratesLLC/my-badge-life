import { useState, useRef } from "react";
import { Camera, Upload, X, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BadgeAnalysisResults } from "./BadgeAnalysisResults";
import { useBadgeConfirmations } from "@/hooks/useBadgeConfirmations";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";


interface CameraCaptureProps {
  onImageCapture: (file: File) => Promise<void>;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { confirmMatch } = useBadgeConfirmations();
  const { trackSearch } = useAnalyticsTracking();
  

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
    const isCamera = e.target.hasAttribute('capture');
    const files = e.target.files;
    
    if (files && files[0]) {
      const file = files[0];
      setDebugInfo(`${isCamera ? 'CAMERA' : 'FILE'}: ${file.name} (${file.size} bytes, ${file.type})`);
      handleFile(files[0]);
    } else {
      setDebugInfo('No file selected');
    }
  };

  const handleFile = async (file: File) => {
    if (file.type.startsWith('image/')) {
      setSelectedFile(file);
      const imageUrl = URL.createObjectURL(file);
      setUploadedImageUrl(imageUrl);
      
      // Enhanced debugging for file differences
      const fileInfo = `Size: ${(file.size / 1024 / 1024).toFixed(2)}MB, Type: ${file.type}, Name: ${file.name}`;
      setDebugInfo(prev => prev + ` ✓ Ready - ${fileInfo}`);
    } else {
      setDebugInfo(`Error: Not an image (${file.type})`);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast({
        title: "No Image Selected",
        description: "Please select an image first",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    const startTime = Date.now();
    
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        try {
          console.log('Starting badge matching analysis...');
          console.log('Image size:', selectedFile.size, 'bytes');
          console.log('Base64 length:', base64?.length);
          
          // Step 1: Badge matching search
          const { data, error } = await supabase.functions.invoke('match-badge-image', {
            body: { imageBase64: base64, debug: false }
          });

          console.log('Function response:', { data, error });

          if (error) {
            console.error('Function invocation error:', error);
            throw error;
          }

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

          setAnalysisResults({...data, originalImageBase64: base64, originalFile: selectedFile});
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
        }
      };
      reader.readAsDataURL(selectedFile);
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

  const handleUploadToDatabase = async () => {
    if (!selectedFile) {
      setDebugInfo('Error: No file selected');
      toast({
        title: "No Image Selected",
        description: "Please select an image first",
        variant: "destructive"
      });
      return;
    }

    setDebugInfo(prev => prev + ` → Uploading...`);
    try {
      await onImageCapture(selectedFile);
      setDebugInfo(prev => prev + ` ✓ Success!`);
      onClose();
    } catch (error) {
      setDebugInfo(prev => prev + ` ✗ Failed: ${error?.message || 'Unknown error'}`);
      // Don't close modal if upload failed
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
    setSelectedFile(null);
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
    if (!selectedFile) {
      toast({
        title: "Cannot retry search",
        description: "No image selected",
        variant: "destructive"
      });
      return;
    }
    
    // Clear all previous results
    setAnalysisResults(null);
    setShowAnalysis(false);
    
    // Re-analyze the same image
    await handleAnalyze();
  };

  const triggerUploadInput = () => {
    console.log('=== TRIGGERING UPLOAD INPUT ===');
    console.log('Upload input ref:', uploadInputRef.current);
    uploadInputRef.current?.click();
  };

  const triggerCameraInput = () => {
    console.log('=== TRIGGERING CAMERA INPUT ===');
    console.log('Camera input ref:', cameraInputRef.current);
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
            {selectedFile ? (
              <div className="flex flex-col items-center space-y-3">
                <img 
                  src={uploadedImageUrl} 
                  alt="Selected badge" 
                  className="max-w-32 max-h-32 object-contain rounded"
                />
                <p className="text-sm font-medium font-mono text-primary">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Ready to analyze or upload
                </p>
              </div>
            ) : (
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
            )}
            
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
          
          {!selectedFile && (
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
          )}
          
          {selectedFile && (
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                >
                  <Search className="h-4 w-4" />
                  {isAnalyzing ? "ANALYZING..." : "ANALYZE"}
                </Button>
                
                <Button
                  variant="matrix"
                  className="flex-1"
                  onClick={handleUploadToDatabase}
                  disabled={isAnalyzing}
                >
                  <Upload className="h-4 w-4" />
                  UPLOAD TO DB
                </Button>
              </div>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSelectedFile(null);
                  setUploadedImageUrl('');
                  if (uploadInputRef.current) uploadInputRef.current.value = '';
                  if (cameraInputRef.current) cameraInputRef.current.value = '';
                }}
                disabled={isAnalyzing}
              >
                SELECT DIFFERENT IMAGE
              </Button>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground text-center font-mono">
            {selectedFile 
              ? "ANALYZE TO FIND SIMILAR OR UPLOAD DIRECTLY TO DATABASE"
              : "SELECT IMAGE TO ANALYZE OR UPLOAD TO DATABASE"
            }
          </p>
          
          {debugInfo && (
            <div className="p-2 bg-muted rounded text-xs font-mono text-center">
              {debugInfo}
            </div>
          )}
          
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