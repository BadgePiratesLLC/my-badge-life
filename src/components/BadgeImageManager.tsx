import { useState } from 'react'
import { Upload, X, Star, StarOff, GripVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useBadgeImages, BadgeImage } from '@/hooks/useBadgeImages'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface BadgeImageManagerProps {
  badgeId: string
  canEdit?: boolean
}

export const BadgeImageManager = ({ badgeId, canEdit = false }: BadgeImageManagerProps) => {
  const { images, loading, primaryImage, addBadgeImage, removeBadgeImage, setPrimaryImage, updateCaption } = useBadgeImages(badgeId)
  const [uploading, setUploading] = useState(false)
  const [editingCaption, setEditingCaption] = useState<string | null>(null)
  const [captionValue, setCaptionValue] = useState('')

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      await addBadgeImage(file)
      // Reset input
      event.target.value = ''
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleCaptionEdit = (image: BadgeImage) => {
    setEditingCaption(image.id)
    setCaptionValue(image.caption || '')
  }

  const handleCaptionSave = async (imageId: string) => {
    try {
      await updateCaption(imageId, captionValue)
      setEditingCaption(null)
    } catch (error) {
      console.error('Failed to update caption:', error)
    }
  }

  const handleCaptionCancel = () => {
    setEditingCaption(null)
    setCaptionValue('')
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading images...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Badge Images ({images.length})</CardTitle>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Label htmlFor="image-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" disabled={uploading} asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Add Image'}
                  </span>
                </Button>
              </Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {images.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No images uploaded yet
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => (
              <div key={image.id} className="relative group">
                <div className="aspect-square rounded-lg border border-border overflow-hidden bg-muted">
                  <img
                    src={image.image_url}
                    alt={image.caption || `Badge image ${image.display_order + 1}`}
                    className="w-full h-full object-contain hover:scale-105 transition-smooth"
                  />
                </div>
                
                {/* Primary badge */}
                {image.is_primary && (
                  <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Primary
                  </Badge>
                )}
                
                {/* Action buttons */}
                {canEdit && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!image.is_primary && (
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPrimaryImage(image.id)}
                        title="Set as primary"
                      >
                        <StarOff className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          title="Remove image"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Image</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove this image? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeBadgeImage(image.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
                
                {/* Caption */}
                <div className="mt-2">
                  {editingCaption === image.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={captionValue}
                        onChange={(e) => setCaptionValue(e.target.value)}
                        placeholder="Enter caption..."
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCaptionSave(image.id)
                          if (e.key === 'Escape') handleCaptionCancel()
                        }}
                      />
                      <Button size="sm" onClick={() => handleCaptionSave(image.id)}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCaptionCancel}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className={`text-sm text-muted-foreground ${canEdit ? 'cursor-pointer hover:text-foreground' : ''}`}
                      onClick={() => canEdit && handleCaptionEdit(image)}
                    >
                      {image.caption || (canEdit ? 'Click to add caption...' : 'No caption')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}