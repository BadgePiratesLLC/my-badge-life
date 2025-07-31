import { useState, useRef } from "react";
import { Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CameraCaptureProps {
  onImageCapture: (file: File) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const CameraCapture = ({ onImageCapture, onClose, isOpen }: CameraCaptureProps) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      onImageCapture(file);
      onClose();
    }
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
            >
              <Upload className="h-4 w-4" />
              UPLOAD
            </Button>
            
            <Button
              variant="matrix"
              className="flex-1"
              onClick={triggerFileInput}
            >
              <Camera className="h-4 w-4" />
              CAMERA
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center font-mono">
            CAPTURE CLEAR PHOTOS FOR BEST IDENTIFICATION
          </p>
        </CardContent>
      </Card>
    </div>
  );
};