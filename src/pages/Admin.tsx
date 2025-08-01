import { useState, useEffect } from 'react'
import { useRoles } from '@/hooks/useRoles'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Upload, Users, Image, Shield, ArrowLeft, Trash2, Edit, Save, X, Settings, Plus, UserPlus, UserMinus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { RoleManagementModal } from '@/components/RoleManagementModal'
import { useTeams, Team, UserWithTeams } from '@/hooks/useTeams'
import { toast } from 'sonner'

interface BadgeData {
  id: string
  name: string
  description: string | null
  year: number | null
  image_url: string | null
  external_link: string | null
  maker_id: string | null
  team_name: string | null
  category: 'Elect Badge' | 'None Elect Badge' | 'SAO' | 'Tool' | 'Misc' | null
  retired: boolean
  created_at: string
  updated_at: string
  profiles?: {
    display_name: string | null
    email: string | null
  } | null
}

interface Upload {
  id: string
  user_id: string | null
  image_url: string
  created_at: string
  profiles?: {
    display_name: string | null
    email: string | null
  } | null
}

interface User {
  id: string
  email: string | null
  display_name: string | null
  roles: string[]
  assigned_team?: string | null
}

export default function Admin() {
  const { isAdmin, loading: rolesLoading } = useRoles()
  const { user, loading: authLoading } = useAuth()
  const { teams, users: teamUsers, loading: teamsLoading, createTeam, updateTeam, deleteTeam, addUserToTeam, removeUserFromTeam } = useTeams()
  const navigate = useNavigate()
  const [uploads, setUploads] = useState<Upload[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [badges, setBadges] = useState<BadgeData[]>([])
  const [editingBadge, setEditingBadge] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<BadgeData>>({})
  const [loading, setLoading] = useState(true)
  const [usersFetched, setUsersFetched] = useState(false)
  const [editingTeam, setEditingTeam] = useState<string | null>(null)
  const [teamForm, setTeamForm] = useState<{ name: string; description: string }>({ name: '', description: '' })
  const [showCreateTeam, setShowCreateTeam] = useState(false)

  useEffect(() => {
    if (!rolesLoading && !authLoading) {
      if (isAdmin()) {
        fetchUploads()
        if (!usersFetched) {
          fetchUsers()
        }
        fetchBadges()
      }
      setLoading(false)
    }
  }, [isAdmin, rolesLoading, authLoading, usersFetched])

  const fetchUploads = async () => {
    try {
      const { data, error } = await supabase
        .from('uploads')
        .select(`
          *,
          profiles:user_id (
            display_name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setUploads(data || [])
    } catch (error) {
      console.error('Error fetching uploads:', error)
      toast.error('Failed to load uploads')
    }
  }

  const fetchUsers = async () => {
    try {
      // Get profiles first
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, display_name, assigned_team')

      if (profilesError) {
        console.error('Profiles error:', profilesError)
        // Don't throw error, just show empty users
        setUsers([])
        return
      }

      // Get roles separately  
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')

      if (rolesError) {
        console.error('Roles error:', rolesError)
        // Continue without roles data
      }

      // Combine the data
      const usersWithRoles = (profilesData || []).map(profile => ({
        id: profile.id,
        email: profile.email,
        display_name: profile.display_name,
        assigned_team: profile.assigned_team,
        roles: (rolesData || [])
          .filter(role => role.user_id === profile.id)
          .map(role => role.role)
      }))

      setUsers(usersWithRoles)
      setUsersFetched(true)
    } catch (error) {
      console.error('Error fetching users:', error)
      // Don't show error toast repeatedly, just log it
      setUsers([])
      setUsersFetched(true) // Still set to true to prevent repeated attempts
    }
  }

  const fetchBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select(`
          *,
          profiles:maker_id (
            display_name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBadges(data || [])
    } catch (error) {
      console.error('Error fetching badges:', error)
      toast.error('Failed to load badges')
    }
  }

  const startEditBadge = (badge: BadgeData) => {
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
  }

  const cancelEditBadge = () => {
    setEditingBadge(null)
    setEditForm({})
  }

  const saveBadgeEdit = async (badgeId: string) => {
    try {
      const { error } = await supabase
        .from('badges')
        .update({
          name: editForm.name,
          description: editForm.description || null,
          year: editForm.year || null,
          image_url: editForm.image_url || null,
          external_link: editForm.external_link || null,
          team_name: editForm.team_name || null,
          category: editForm.category || null,
          retired: editForm.retired
        })
        .eq('id', badgeId)

      if (error) throw error

      // Update local state
      setBadges(prev => prev.map(badge => 
        badge.id === badgeId 
          ? { ...badge, ...editForm, updated_at: new Date().toISOString() }
          : badge
      ))

      setEditingBadge(null)
      setEditForm({})
      toast.success('Badge updated successfully!')
    } catch (error) {
      console.error('Error updating badge:', error)
      toast.error('Failed to update badge')
    }
  }

  const createBadgeFromUpload = (upload: Upload) => {
    // Navigate to badge register form with the image URL and upload ID
    navigate(`/badge/register?image_url=${encodeURIComponent(upload.image_url)}&upload_id=${upload.id}`)
  }

  const deleteUpload = async (upload: Upload) => {
    if (!confirm('Are you sure you want to delete this upload?')) return

    console.log('Starting delete process for upload:', upload.id)

    try {
      // Delete from database first (this is what matters for the UI)
      console.log('Deleting from database...')
      const { error: dbError } = await supabase
        .from('uploads')
        .delete()
        .eq('id', upload.id)

      if (dbError) {
        console.error('Database delete error:', dbError)
        toast.error('Failed to delete upload: ' + dbError.message)
        return
      }
      
      console.log('Database deletion successful')

      // Update UI immediately
      setUploads(prev => {
        const newUploads = prev.filter(u => u.id !== upload.id)
        console.log('Upload count before:', prev.length, 'after:', newUploads.length)
        return newUploads
      })
      
      toast.success('Upload deleted successfully!')
      
    } catch (error) {
      console.error('Error deleting upload:', error)
      toast.error('Failed to delete upload: ' + (error as Error).message)
    }
  }

  if (authLoading || rolesLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground font-mono">LOADING ADMIN PANEL...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center font-mono">ACCESS DENIED</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">You must be logged in to access the admin panel.</p>
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center font-mono text-red-500">INSUFFICIENT PRIVILEGES</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Admin access required.</p>
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-mono">ADMIN PANEL</h1>
            <p className="text-muted-foreground">Manage badges and users</p>
          </div>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to App
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="uploads" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="uploads" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Uploaded Images
            </TabsTrigger>
            <TabsTrigger value="badges" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Badge Management
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Management
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              User Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="uploads" className="space-y-4">
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
                            <p className="text-xs text-muted-foreground">
                              {new Date(upload.created_at).toLocaleDateString()}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => createBadgeFromUpload(upload)}
                                className="flex-1"
                                variant="matrix"
                              >
                                Create Badge
                              </Button>
                              <Button
                                onClick={() => deleteUpload(upload)}
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
          </TabsContent>

          <TabsContent value="badges" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono">
                  <Settings className="h-5 w-5" />
                  BADGE MANAGEMENT ({badges.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {badges.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No badges found</p>
                ) : (
                  <div className="space-y-4">
                    {badges.map((badge) => (
                      <Card key={badge.id}>
                        <CardContent className="p-6">
                          {editingBadge === badge.id ? (
                            // Edit mode
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
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                  id="description"
                                  value={editForm.description || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                  placeholder="Badge description"
                                  rows={3}
                                />
                              </div>

                              <div>
                                <Label htmlFor="team_name">Badge Maker Team</Label>
                                <Select 
                                  value={editForm.team_name || ''} 
                                  onValueChange={(value) => setEditForm(prev => ({ ...prev, team_name: value || null }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select team (or leave empty)" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">No Team</SelectItem>
                                    {teams.map((team) => (
                                      <SelectItem key={team.id} value={team.name}>
                                        {team.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor="category">Category</Label>
                                <Select 
                                  value={editForm.category || ''} 
                                  onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value as BadgeData['category'] }))}
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
                                  <label className="text-sm font-medium mb-2 block">External Link</label>
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
                                  placeholder="Image URL"
                                />
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="retired"
                                  checked={editForm.retired || false}
                                  onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, retired: !!checked }))}
                                />
                                <Label htmlFor="retired" className="text-sm font-medium">
                                  Retired Badge (can no longer be obtained)
                                </Label>
                              </div>
                              
                              <div className="flex gap-2 pt-4">
                                <Button
                                  onClick={() => saveBadgeEdit(badge.id)}
                                  className="flex items-center gap-2"
                                >
                                  <Save className="h-4 w-4" />
                                  Save Changes
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={cancelEditBadge}
                                  className="flex items-center gap-2"
                                >
                                  <X className="h-4 w-4" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // View mode
                            <div className="flex gap-6">
                              {badge.image_url && (
                                <div className="flex-shrink-0">
                                  <img
                                    src={badge.image_url}
                                    alt={badge.name}
                                    className="w-24 h-24 object-cover rounded border"
                                  />
                                </div>
                              )}
                              
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="text-lg font-semibold">{badge.name}</h3>
                                    {badge.description && (
                                      <p className="text-sm text-muted-foreground mt-1">{badge.description}</p>
                                    )}
                                  </div>
                                  
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => startEditBadge(badge)}
                                    className="flex items-center gap-2"
                                  >
                                    <Edit className="h-4 w-4" />
                                    Edit
                                  </Button>
                                </div>
                                
                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                  {badge.year && <span>Year: {badge.year}</span>}
                                  {badge.team_name && <span>Team: {badge.team_name}</span>}
                                  {badge.category && <span>Category: {badge.category}</span>}
                                  {badge.profiles?.display_name && (
                                    <span>Creator: {badge.profiles.display_name}</span>
                                  )}
                                  {badge.retired && (
                                    <Badge variant="destructive" className="text-xs">RETIRED</Badge>
                                  )}
                                </div>
                                
                                {badge.external_link && (
                                  <div className="text-sm">
                                    <a 
                                      href={badge.external_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline"
                                    >
                                      {badge.external_link}
                                    </a>
                                  </div>
                                )}
                                
                                <div className="text-xs text-muted-foreground">
                                  Created: {new Date(badge.created_at).toLocaleDateString()}
                                  {badge.updated_at !== badge.created_at && (
                                    <span> • Updated: {new Date(badge.updated_at).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono">
                  <Users className="h-5 w-5" />
                  TEAM MANAGEMENT ({teams.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Button 
                    onClick={() => setShowCreateTeam(!showCreateTeam)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create New Team
                  </Button>
                </div>

                {showCreateTeam && (
                  <Card className="mb-4">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="teamName">Team Name</Label>
                          <Input
                            id="teamName"
                            value={teamForm.name}
                            onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Team name (e.g., DEF CON Goons)"
                          />
                        </div>
                        <div>
                          <Label htmlFor="teamDescription">Description (optional)</Label>
                          <Textarea
                            id="teamDescription"
                            value={teamForm.description}
                            onChange={(e) => setTeamForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Team description"
                            rows={2}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={async () => {
                              if (teamForm.name.trim()) {
                                await createTeam(teamForm.name.trim(), teamForm.description.trim() || undefined)
                                setTeamForm({ name: '', description: '' })
                                setShowCreateTeam(false)
                              }
                            }}
                            disabled={!teamForm.name.trim()}
                          >
                            Create Team
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowCreateTeam(false)
                              setTeamForm({ name: '', description: '' })
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {teams.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No teams found</p>
                ) : (
                  <div className="space-y-4">
                    {teams.map((team) => (
                      <Card key={team.id}>
                        <CardContent className="p-6">
                          {editingTeam === team.id ? (
                            // Edit mode for team
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="editTeamName">Team Name</Label>
                                <Input
                                  id="editTeamName"
                                  value={teamForm.name}
                                  onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                                  placeholder="Team name"
                                />
                              </div>
                              <div>
                                <Label htmlFor="editTeamDescription">Description</Label>
                                <Textarea
                                  id="editTeamDescription"
                                  value={teamForm.description}
                                  onChange={(e) => setTeamForm(prev => ({ ...prev, description: e.target.value }))}
                                  placeholder="Team description"
                                  rows={2}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={async () => {
                                    await updateTeam(team.id, {
                                      name: teamForm.name.trim(),
                                      description: teamForm.description.trim() || undefined
                                    })
                                    setEditingTeam(null)
                                    setTeamForm({ name: '', description: '' })
                                  }}
                                  disabled={!teamForm.name.trim()}
                                  className="flex items-center gap-2"
                                >
                                  <Save className="h-4 w-4" />
                                  Save Changes
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setEditingTeam(null)
                                    setTeamForm({ name: '', description: '' })
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <X className="h-4 w-4" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // View mode for team
                            <div>
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <h3 className="text-lg font-semibold">{team.name}</h3>
                                  {team.description && (
                                    <p className="text-sm text-muted-foreground mt-1">{team.description}</p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingTeam(team.id)
                                      setTeamForm({
                                        name: team.name,
                                        description: team.description || ''
                                      })
                                    }}
                                    className="flex items-center gap-2"
                                  >
                                    <Edit className="h-4 w-4" />
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={async () => {
                                      if (confirm(`Are you sure you want to delete team "${team.name}"?`)) {
                                        await deleteTeam(team.id)
                                      }
                                    }}
                                    className="flex items-center gap-2"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </Button>
                                </div>
                              </div>

                              {/* Team Members Section */}
                              <div className="border-t pt-4">
                                <h4 className="font-medium mb-3">Team Members ({teamUsers.filter(u => u.teams.includes(team.name)).length})</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                                  {teamUsers.filter(u => u.teams.includes(team.name)).map((user) => (
                                    <div key={user.id} className="flex items-center justify-between p-2 bg-muted rounded">
                                      <span className="text-sm">{user.display_name || user.email}</span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => removeUserFromTeam(user.id, team.id)}
                                        className="flex items-center gap-1"
                                      >
                                        <UserMinus className="h-3 w-3" />
                                        Remove
                                      </Button>
                                    </div>
                                  ))}
                                </div>

                                {/* Add Members Dropdown */}
                                <div className="flex gap-2">
                                  <Select onValueChange={(userId) => addUserToTeam(userId, team.id)}>
                                    <SelectTrigger className="w-64">
                                      <SelectValue placeholder="Add user to team" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {teamUsers.filter(u => !u.teams.includes(team.name)).map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                          {user.display_name || user.email}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono">
                  <Users className="h-5 w-5" />
                  USER MANAGEMENT ({users.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No users found</p>
                ) : (
                  <div className="space-y-4">
                    {users.map((userData) => (
                      <Card key={userData.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">
                                {userData.display_name || userData.email || 'Unknown User'}
                              </h3>
                               <p className="text-sm text-muted-foreground">{userData.email}</p>
                               {userData.assigned_team && (
                                 <p className="text-sm text-muted-foreground">Team: {userData.assigned_team}</p>
                               )}
                              <div className="flex gap-1 mt-2">
                                {userData.roles.length > 0 ? (
                                  userData.roles.map((role) => (
                                    <Badge key={role} variant="secondary">
                                      {role}
                                    </Badge>
                                  ))
                                ) : (
                                  <Badge variant="outline">No roles</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <RoleManagementModal 
                                user={userData} 
                                onRoleChange={() => {
                                  setUsersFetched(false)
                                  fetchUsers()
                                }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}