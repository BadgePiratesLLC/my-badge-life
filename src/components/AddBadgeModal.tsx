import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Upload, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBadges } from "@/hooks/useBadges";
import { useToast } from "@/hooks/use-toast";
import { useDiscordNotifications } from "@/hooks/useDiscordNotifications";

interface AddBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillData?: any;
}

export const AddBadgeModal = ({ isOpen, onClose, prefillData }: AddBadgeModalProps) => {
  const [formData, setFormData] = useState({
    name: prefillData?.name || "",
    year: prefillData?.year?.toString() || "",
    description: prefillData?.description || "",
    external_link: prefillData?.external_link || "",
  });
  
  // Update form when prefillData changes
  React.useEffect(() => {
    if (prefillData) {
      setFormData({
        name: prefillData?.name || "",
        year: prefillData?.year?.toString() || "",
        description: prefillData?.description || "",
        external_link: prefillData?.external_link || "",
      });
    }
  }, [prefillData]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const { profile } = useAuth();
  const { createBadge, uploadBadgeImage } = useBadges();
  const { toast } = useToast();
  const { notifyBadgeSubmitted } = useDiscordNotifications();

  if (!isOpen) return null;

  const canAddBadges = profile?.role === 'admin' || 
    (profile?.role === 'maker' && profile?.maker_approved);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canAddBadges) {
      toast({
        title: "Permission Denied",
        description: "You need to be an approved maker to add badges.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    try {
      let imageUrl = "";
      
      if (imageFile) {
        const { url } = await uploadBadgeImage(imageFile);
        imageUrl = url;
      }

      await createBadge({
        name: formData.name,
        year: formData.year ? parseInt(formData.year) : undefined,
        description: formData.description || undefined,
        external_link: formData.external_link || undefined,
        image_url: imageUrl || undefined,
      });

      // Send Discord notification
      try {
        await notifyBadgeSubmitted({
          name: formData.name,
          team_name: undefined, // No team selection in this modal
          category: undefined, // No category selection in this modal
          year: formData.year ? parseInt(formData.year) : undefined,
          maker_name: profile?.display_name || undefined,
          image_url: imageUrl || undefined,
        });
      } catch (error) {
        console.error('Failed to send Discord notification:', error);
        // Don't fail the badge creation if notification fails
      }

      toast({
        title: "Badge Added!",
        description: `${formData.name} has been added to the database.`,
      });

      // Reset form
      setFormData({ name: "", year: "", description: "", external_link: "" });
      setImageFile(null);
      onClose();
    } catch (error) {
      console.error('Error adding badge:', error);
      toast({
        title: "Error",
        description: "Failed to add badge. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  if (!canAddBadges) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg font-mono">PERMISSION REQUIRED</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You need to be an approved badge maker to add new badges.
            </p>
            <Button 
              variant="matrix" 
              className="w-full"
              onClick={() => {
                // This would trigger maker request in real implementation
                toast({
                  title: "Maker Request Sent",
                  description: "An admin will review your request soon.",
                });
                onClose();
              }}
            >
              REQUEST MAKER STATUS
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg font-mono">ADD NEW BADGE</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-mono text-xs">BADGE NAME</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="DEF CON 31 Badge"
                required
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year" className="font-mono text-xs">YEAR</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                placeholder="2023"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="font-mono text-xs">DESCRIPTION</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Interactive badge with LED matrix..."
                className="font-mono text-sm"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="external_link" className="font-mono text-xs">EXTERNAL LINK</Label>
              <Input
                id="external_link"
                type="url"
                value={formData.external_link}
                onChange={(e) => setFormData(prev => ({ ...prev, external_link: e.target.value }))}
                placeholder="https://defcon.org"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image" className="font-mono text-xs">BADGE IMAGE</Label>
              <div className="border-2 border-dashed border-border rounded p-4 text-center">
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('image')?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4" />
                  {imageFile ? imageFile.name : "UPLOAD IMAGE"}
                </Button>
              </div>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={uploading}
              >
                CANCEL
              </Button>
              <Button
                type="submit"
                variant="matrix"
                className="flex-1"
                disabled={uploading || !formData.name}
              >
                <Plus className="h-4 w-4" />
                {uploading ? "UPLOADING..." : "ADD BADGE"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};