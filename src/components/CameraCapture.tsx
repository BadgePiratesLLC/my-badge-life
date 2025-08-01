import { useState, useRef } from "react";
import { Camera, Upload, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BadgeMatchResults } from "./BadgeMatchResults";
import { useToast } from "@/hooks/use-toast";

interface CameraCaptureProps {
  onImageCapture: (file: File) => void;
  onClose: () => void;
  isOpen: boolean;
  enableMatching?: boolean;
}

export const CameraCapture = ({ onImageCapture, onClose, isOpen, enableMatching = false }: CameraCaptureProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
      if (enableMatching) {
        await handleImageMatching(file);
      } else {
        onImageCapture(file);
        onClose();
      }
    }
  };

  const handleImageMatching = async (file: File) => {
    setIsMatching(true);
    
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        try {
          const { data, error } = await supabase.functions.invoke('match-badge-image', {
            body: { imageBase64: base64 }
          });

          if (error) {
            throw error;
          }

          setMatchResults(data.matches || []);
          setShowResults(true);
          setIsMatching(false);
        } catch (matchError) {
          console.error('Error matching badge:', matchError);
          toast({
            title: "Matching Failed",
            description: "Could not search for similar badges. Try creating a new one.",
            variant: "destructive"
          });
          setIsMatching(false);
          // Fallback to regular creation
          onImageCapture(file);
          onClose();
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image:', error);
      setIsMatching(false);
      toast({
        title: "Error",
        description: "Could not process the image",
        variant: "destructive"
      });
    }
  };

  const handleCreateNew = () => {
    setShowResults(false);
    const fileInput = fileInputRef.current;
    if (fileInput?.files?.[0]) {
      onImageCapture(fileInput.files[0]);
    }
    onClose();
  };

  const handleCloseResults = () => {
    setShowResults(false);
    setMatchResults([]);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
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
            onClick={triggerFileInput}
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
              ref={fileInputRef}
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
              onClick={triggerFileInput}
              disabled={isMatching}
            >
              <Upload className="h-4 w-4" />
              UPLOAD
            </Button>
            
            <Button
              variant="matrix"
              className="flex-1"
              onClick={triggerFileInput}
              disabled={isMatching}
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
                onClick={triggerFileInput}
                disabled={isMatching}
              >
                <Search className="h-4 w-4" />
                {isMatching ? "SEARCHING..." : "FIND SIMILAR"}
              </Button>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground text-center font-mono">
            {enableMatching 
              ? "CAPTURE TO SEARCH FOR SIMILAR BADGES OR CREATE NEW"
              : "CAPTURE CLEAR PHOTOS FOR BEST IDENTIFICATION"
            }
          </p>
          
          {isMatching && (
            <div className="flex items-center justify-center space-x-2 py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-xs font-mono text-muted-foreground">
                ANALYZING IMAGE...
              </span>
            </div>
          )}
        </CardContent>
      </Card>
      
      <BadgeMatchResults
        matches={matchResults}
        isOpen={showResults}
        onClose={handleCloseResults}
        onCreateNew={handleCreateNew}
      />
    </div>
  );
};