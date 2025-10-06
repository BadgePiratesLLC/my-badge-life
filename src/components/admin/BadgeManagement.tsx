import React, { memo, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Settings, Edit, Save, X, Trash2, ExternalLink } from 'lucide-react'
import { ProcessEmbeddingsButton } from '@/components/ProcessEmbeddingsButton'
import { BadgeImageManager } from '@/components/BadgeImageManager'
import { BadgeStatsDisplay } from '@/components/BadgeStatsDisplay'
import { Badge as BadgeUI } from '@/components/ui/badge'

interface BadgeData {
  id: string
  name: string
  description: string | null
  image_url: string | null
  year: number | null
  category: string | null
  team_name: string | null
  external_link: string | null
  retired: boolean
  created_at: string
  updated_at: string
  profiles?: {
    display_name: string | null
  } | null
}

interface Team {
  id: string
  name: string
}

interface BadgeManagementProps {
  badges: BadgeData[]
  teams: Team[]
  canEditBadge: (teamName: string | null) => boolean
  onSaveBadge: (badgeId: string, updates: Partial<BadgeData>) => Promise<void>
  onDeleteBadge: (badge: BadgeData) => Promise<void>
  userTeam?: string | null
}

export const BadgeManagement = memo(function BadgeManagement({
  badges,
  teams,
  canEditBadge,
  onSaveBadge,
  onDeleteBadge,
  userTeam
}: BadgeManagementProps) {
  const [editingBadge, setEditingBadge] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<BadgeData>>({})
  const [teamFilter, setTeamFilter] = useState<string>(userTeam || 'all')

  const startEdit = useCallback((badge: BadgeData) => {
    setEditingBadge(badge.id)
    setEditForm({
      name: badge.name,
      description: badge.description || '',
      year: badge.year,
      image_url: badge.image_url || '',
      external_link: badge.external_link || '',
      team_name: badge.team_name || '',
      category: badge.category || null,
      retired: badge.retired
    })
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingBadge(null)
    setEditForm({})
  }, [])

  const saveEdit = useCallback(async (badgeId: string) => {
    await onSaveBadge(badgeId, editForm)
    setEditingBadge(null)
    setEditForm({})
  }, [editForm, onSaveBadge])

  const filteredBadges = badges.filter(badge => {
    if (teamFilter === 'all') return true
    if (teamFilter === 'unassigned') return !badge.team_name
    return badge.team_name === teamFilter
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-mono">
          <Settings className="h-5 w-5" />
          BADGE MANAGEMENT ({filteredBadges.length} of {badges.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-4">
          <ProcessEmbeddingsButton />
          
          <div>
            <Label>Filter by Team</Label>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Badges</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.name}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {filteredBadges.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No badges found</p>
        ) : (
          <div className="space-y-4">
            {filteredBadges.map((badge) => (
              <Card key={badge.id}>
                <CardContent className="p-6">
                  {editingBadge === badge.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Badge Name</label>
                        <Input
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Badge name"
                        />
                      </div>
                      
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Badge description"
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label>Badge Maker Team</Label>
                        <Select 
                          value={editForm.team_name || 'none'} 
                          onValueChange={(value) => setEditForm(prev => ({ ...prev, team_name: value === 'none' ? null : value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select team (or leave empty)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Team</SelectItem>
                            {teams.map((team) => (
                              <SelectItem key={team.id} value={team.name}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Category</Label>
                        <Select 
                          value={editForm.category || ''} 
                          onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select badge category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Elect Badge">Elect Badge</SelectItem>
                            <SelectItem value="None Elect Badge">None Elect Badge</SelectItem>
                            <SelectItem value="SAO">SAO</SelectItem>
                            <SelectItem value="Tool">Tool</SelectItem>
                            <SelectItem value="Misc">Misc</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Year</label>
                          <Input
                            type="number"
                            value={editForm.year || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, year: e.target.value ? parseInt(e.target.value) : null }))}
                            placeholder="Year"
                          />
                        </div>
                        
                        <div>
                          <Label>Purchase Link</Label>
                          <Input
                            value={editForm.external_link || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, external_link: e.target.value }))}
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Image URL</label>
                        <Input
                          value={editForm.image_url || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, image_url: e.target.value }))}
                          placeholder="https://..."
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`retired-${badge.id}`}
                          checked={editForm.retired || false}
                          onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, retired: checked as boolean }))}
                        />
                        <Label htmlFor={`retired-${badge.id}`}>Retired</Label>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button onClick={() => saveEdit(badge.id)}>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button variant="outline" onClick={cancelEdit}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{badge.name}</h3>
                            {badge.retired && (
                              <BadgeUI variant="secondary">Retired</BadgeUI>
                            )}
                            {badge.category && (
                              <BadgeUI variant="outline">{badge.category}</BadgeUI>
                            )}
                            {badge.team_name && (
                              <BadgeUI variant="default">{badge.team_name}</BadgeUI>
                            )}
                          </div>
                          
                          {badge.year && (
                            <p className="text-sm text-muted-foreground">Year: {badge.year}</p>
                          )}
                          
                          {badge.description && (
                            <p className="text-sm mt-2">{badge.description}</p>
                          )}
                          
                          {badge.profiles?.display_name && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Maker: {badge.profiles.display_name}
                            </p>
                          )}
                          
                          {badge.external_link && (
                            <div className="text-sm mt-2">
                              <a 
                                href={badge.external_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                Purchase Link <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                          
                          <div className="text-xs text-muted-foreground mt-2">
                            Created: {new Date(badge.created_at).toLocaleDateString()}
                            {badge.updated_at !== badge.created_at && (
                              <span> • Updated: {new Date(badge.updated_at).toLocaleDateString()}</span>
                            )}
                          </div>

                          <div className="mt-4">
                            <BadgeStatsDisplay badgeId={badge.id} />
                          </div>
                        </div>
                        
                        {badge.image_url && (
                          <img
                            src={badge.image_url}
                            alt={badge.name}
                            className="w-24 h-24 object-cover rounded ml-4"
                          />
                        )}
                      </div>

                      <div className="border-t pt-4">
                        <BadgeImageManager badgeId={badge.id} />
                      </div>
                      
                      {canEditBadge(badge.team_name) && (
                        <div className="flex gap-2 mt-4">
                          <Button
                            variant="outline"
                            onClick={() => startEdit(badge)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => onDeleteBadge(badge)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
})
