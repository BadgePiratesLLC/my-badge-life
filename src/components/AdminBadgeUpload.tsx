import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Camera, X } from 'lucide-react';
import { AddBadgeModal } from './AddBadgeModal';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface AdminBadgeUploadProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminBadgeUpload = ({ isOpen, onClose }: AdminBadgeUploadProps) => {
  const { user, loading: authLoading } = useAuth();
  const [isDragActive, setIsDragActive] = useState(false);
  const [showBadgeForm, setShowBadgeForm] = useState(false);
  const [capturedImage, setCapturedImage] = useState<{ url: string; file: File } | null>(null);
  
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen && !showBadgeForm) return null;

  // Check authentication before allowing uploads
  if (!authLoading && !user) {
    toast.error('You must be logged in to upload badges');
    onClose();
    return null;
  }

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setCapturedImage({ url: imageUrl, file });
    setShowBadgeForm(true);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

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

  const triggerUploadInput = () => {
    uploadInputRef.current?.click();
  };

  const triggerCameraInput = () => {
    cameraInputRef.current?.click();
  };

  const handleCloseBadgeForm = () => {
    setShowBadgeForm(false);
    setCapturedImage(null);
    onClose();
  };

  if (showBadgeForm && capturedImage) {
    return (
      <AddBadgeModal
        isOpen={true}
        onClose={handleCloseBadgeForm}
        prefillData={{
          image_url: capturedImage.url,
          imageFile: capturedImage.file
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg font-mono">ADMIN BADGE UPLOAD</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground font-mono">
            Upload badge images directly to create new badges. No AI analysis required.
          </p>

          {/* Drag and Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2 font-mono">
              {isDragActive ? 'DROP IMAGE HERE' : 'DRAG IMAGE HERE OR'}
            </p>
            
            {/* Upload Buttons */}
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={triggerUploadInput}
                className="font-mono"
              >
                <Upload className="h-4 w-4 mr-2" />
                BROWSE FILES
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={triggerCameraInput}
                className="font-mono"
              >
                <Camera className="h-4 w-4 mr-2" />
                USE CAMERA
              </Button>
            </div>
          </div>

          {/* Hidden File Inputs */}
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

          <div className="text-xs text-muted-foreground font-mono text-center">
            SUPPORTED: JPG, PNG, WEBP, GIF
          </div>
        </CardContent>
      </Card>
    </div>
  );
};