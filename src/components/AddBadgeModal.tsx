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
import { useTeams } from "@/hooks/useTeams";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    team_name: prefillData?.team_name || "",
  });
  
  // Update form when prefillData changes
  React.useEffect(() => {
    if (prefillData) {
      setFormData({
        name: prefillData?.name || "",
        year: prefillData?.year?.toString() || "",
        description: prefillData?.description || "",
        external_link: prefillData?.external_link || "",
        team_name: prefillData?.team_name || "",
      });
      // If prefillData has an image_url, we don't need file upload
      if (prefillData?.image_url) {
        setImageFile(null);
      }
    }
  }, [prefillData]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const { profile } = useAuth();
  const { createBadge, uploadBadgeImage } = useBadges();
  const { toast } = useToast();
  const { notifyBadgeSubmitted } = useDiscordNotifications();
  const { teams } = useTeams();

  if (!isOpen) return null;

  const canAddBadges = profile?.role === 'admin' || 
    (profile?.role === 'maker' && profile?.maker_approved);
  
  const canUploadForApproval = !!profile; // Any logged-in user can upload for approval

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canUploadForApproval) {
      toast({
        title: "Authentication Required",
        description: "You need to be logged in to upload badges.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    try {
      let imageUrl = "";
      
      // For non-approved users, just upload the image for approval
      if (!canAddBadges) {
        // Regular user - upload for approval only (with notification)
        if (imageFile) {
          await uploadBadgeImage(imageFile, true);
        } else if (prefillData?.imageFile) {
          await uploadBadgeImage(prefillData.imageFile, true);
        }
      } else {
        // Admin or approved maker - handle image upload and create badge
        // Check if prefillData has a blob URL that needs to be uploaded
        if (prefillData?.image_url && prefillData.image_url.startsWith('blob:')) {
          // Convert blob URL to file and upload (no notification - badge creation will notify)
          if (prefillData.imageFile) {
            const { url } = await uploadBadgeImage(prefillData.imageFile, false);
            imageUrl = url;
          }
        } else if (prefillData?.image_url && !prefillData.image_url.startsWith('blob:')) {
          // Use the existing valid URL
          imageUrl = prefillData.image_url;
        } else if (imageFile) {
          // Upload new image file (no notification - badge creation will notify)
          const { url } = await uploadBadgeImage(imageFile, false);
          imageUrl = url;
        }

        // Create badge directly
        await createBadge({
          name: formData.name,
          year: formData.year ? parseInt(formData.year) : undefined,
          description: formData.description || undefined,
          external_link: formData.external_link || undefined,
          image_url: imageUrl || undefined,
          team_name: formData.team_name || undefined,
        });
      }

      // Send Discord notification
      try {
        if (canAddBadges) {
          await notifyBadgeSubmitted({
            name: formData.name,
            team_name: formData.team_name || undefined,
            category: undefined,
            year: formData.year ? parseInt(formData.year) : undefined,
            maker_name: profile?.display_name || undefined,
            image_url: imageUrl || undefined,
          });
        }
      } catch (error) {
        console.error('Failed to send Discord notification:', error);
        // Don't fail the badge creation if notification fails
      }

      const successMessage = canAddBadges 
        ? `${formData.name} has been added to the database.`
        : `${formData.name} has been submitted for approval.`;
        
      toast({
        title: canAddBadges ? "Badge Added!" : "Badge Submitted!",
        description: successMessage,
      });

      // Reset form
      setFormData({ name: "", year: "", description: "", external_link: "", team_name: "" });
      setImageFile(null);
      onClose();
    } catch (error) {
      console.error('Error adding badge:', error);
      const errorMessage = canAddBadges ? "Failed to add badge. Please try again." : "Failed to submit badge. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
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

  if (!canUploadForApproval) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg font-mono">LOGIN REQUIRED</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You need to be logged in to upload badges.
            </p>
            <Button 
              variant="matrix" 
              className="w-full"
              onClick={onClose}
            >
              LOGIN TO UPLOAD
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
          <CardTitle className="text-lg font-mono">{canAddBadges ? "ADD NEW BADGE" : "SUBMIT BADGE FOR APPROVAL"}</CardTitle>
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
              <Label htmlFor="team_name" className="font-mono text-xs">TEAM</Label>
              <Select 
                value={formData.team_name} 
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, team_name: value }));
                  
                  // Auto-populate external URL with team's website URL if available
                  const selectedTeam = teams.find(team => team.name === value);
                  if (selectedTeam?.website_url && !formData.external_link) {
                    setFormData(prev => ({ ...prev, external_link: selectedTeam.website_url }));
                  }
                }}
              >
                <SelectTrigger className="font-mono">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.name}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {prefillData?.image_url ? (
                <div className="space-y-2">
                  <div className="border rounded p-2 bg-muted">
                    <img 
                      src={prefillData.image_url} 
                      alt="Badge preview" 
                      className="w-full max-w-32 mx-auto rounded"
                    />
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      Image from analysis
                    </p>
                  </div>
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
                      size="sm"
                    >
                      <Upload className="h-4 w-4" />
                      {imageFile ? imageFile.name : "REPLACE WITH NEW IMAGE"}
                    </Button>
                  </div>
                </div>
              ) : (
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
              )}
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
                {uploading ? "UPLOADING..." : (canAddBadges ? "ADD BADGE" : "SUBMIT FOR APPROVAL")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};