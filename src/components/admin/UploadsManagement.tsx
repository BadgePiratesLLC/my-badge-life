import React, { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Trash2 } from 'lucide-react'

interface Upload {
  id: string
  user_id: string | null
  image_url: string
  created_at: string
  badge_name?: string | null
  badge_description?: string | null
  profiles?: {
    display_name: string | null
    email: string | null
  } | null
}

interface Badge {
  id: string
  name: string
}

interface UploadsManagementProps {
  uploads: Upload[]
  badges: Badge[]
  onCreateBadge: (upload: Upload) => void
  onAssociateImage: (imageUrl: string, badgeId: string) => void
  onDeleteUpload: (upload: Upload) => void
}

export const UploadsManagement = memo(function UploadsManagement({
  uploads,
  badges,
  onCreateBadge,
  onAssociateImage,
  onDeleteUpload
}: UploadsManagementProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-mono">
          <Upload className="h-5 w-5" />
          UPLOADED IMAGES ({uploads.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {uploads.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No uploads found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploads.map((upload) => (
              <Card key={upload.id} className="overflow-hidden">
                <div className="aspect-video relative">
                  <img
                    src={upload.image_url}
                    alt="Upload"
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Uploaded by: {upload.profiles?.display_name || upload.profiles?.email || 'Anonymous'}
                    </p>
                    {upload.badge_name && (
                      <p className="text-sm font-medium">
                        Suggested: {upload.badge_name}
                      </p>
                    )}
                    {upload.badge_description && (
                      <p className="text-xs text-muted-foreground">
                        {upload.badge_description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(upload.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => onCreateBadge(upload)}
                        className="flex-1"
                        variant="matrix"
                      >
                        Create Badge
                      </Button>
                      <Select onValueChange={(badgeId) => onAssociateImage(upload.image_url, badgeId)}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Associate with badge..." />
                        </SelectTrigger>
                        <SelectContent>
                          {badges.map((badge) => (
                            <SelectItem key={badge.id} value={badge.id}>
                              {badge.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => onDeleteUpload(upload)}
                        size="icon"
                        variant="destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
})
