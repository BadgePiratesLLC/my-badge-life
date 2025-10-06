import React, { memo, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Plus, Edit, Save, X, Trash2, UserMinus } from 'lucide-react'

interface Team {
  id: string
  name: string
  description: string | null
  website_url: string | null
}

interface UserWithTeams {
  id: string
  display_name: string | null
  email: string | null
  teams: string[]
}

interface TeamManagementProps {
  teams: Team[]
  users: UserWithTeams[]
  onCreateTeam: (name: string, description?: string, websiteUrl?: string) => Promise<any>
  onUpdateTeam: (teamId: string, updates: { name?: string; description?: string; website_url?: string }) => Promise<any>
  onDeleteTeam: (teamId: string) => Promise<void>
  onAddUserToTeam: (userId: string, teamId: string) => Promise<any>
  onRemoveUserFromTeam: (userId: string, teamId: string) => Promise<void>
}

export const TeamManagement = memo(function TeamManagement({
  teams,
  users,
  onCreateTeam,
  onUpdateTeam,
  onDeleteTeam,
  onAddUserToTeam,
  onRemoveUserFromTeam
}: TeamManagementProps) {
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [editingTeam, setEditingTeam] = useState<string | null>(null)
  const [teamForm, setTeamForm] = useState({ name: '', description: '', website_url: '' })

  const resetForm = useCallback(() => {
    setTeamForm({ name: '', description: '', website_url: '' })
  }, [])

  const handleCreateTeam = useCallback(async () => {
    if (teamForm.name.trim()) {
      await onCreateTeam(
        teamForm.name.trim(),
        teamForm.description.trim() || undefined,
        teamForm.website_url.trim() || undefined
      )
      resetForm()
      setShowCreateTeam(false)
    }
  }, [teamForm, onCreateTeam, resetForm])

  const handleUpdateTeam = useCallback(async (teamId: string) => {
    await onUpdateTeam(teamId, {
      name: teamForm.name.trim(),
      description: teamForm.description.trim() || undefined,
      website_url: teamForm.website_url.trim() || undefined
    })
    setEditingTeam(null)
    resetForm()
  }, [teamForm, onUpdateTeam, resetForm])

  const startEdit = useCallback((team: Team) => {
    setEditingTeam(team.id)
    setTeamForm({
      name: team.name,
      description: team.description || '',
      website_url: team.website_url || ''
    })
  }, [])

  return (
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
                  <Label>Team Name</Label>
                  <Input
                    value={teamForm.name}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Team name (e.g., DEF CON Goons)"
                  />
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={teamForm.description}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Team description"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Website URL (optional)</Label>
                  <Input
                    type="url"
                    value={teamForm.website_url}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, website_url: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateTeam}
                    disabled={!teamForm.name.trim()}
                  >
                    Create Team
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateTeam(false)
                      resetForm()
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
                    <div className="space-y-4">
                      <div>
                        <Label>Team Name</Label>
                        <Input
                          value={teamForm.name}
                          onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Team name"
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={teamForm.description}
                          onChange={(e) => setTeamForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Team description"
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label>Website URL</Label>
                        <Input
                          type="url"
                          value={teamForm.website_url}
                          onChange={(e) => setTeamForm(prev => ({ ...prev, website_url: e.target.value }))}
                          placeholder="https://example.com"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleUpdateTeam(team.id)}
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
                            resetForm()
                          }}
                          className="flex items-center gap-2"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
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
                            onClick={() => startEdit(team)}
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
                                await onDeleteTeam(team.id)
                              }
                            }}
                            className="flex items-center gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">
                          Team Members ({users.filter(u => u.teams.includes(team.name)).length})
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                          {users.filter(u => u.teams.includes(team.name)).map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm">{user.display_name || user.email}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onRemoveUserFromTeam(user.id, team.id)}
                                className="flex items-center gap-1"
                              >
                                <UserMinus className="h-3 w-3" />
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <Select onValueChange={(userId) => onAddUserToTeam(userId, team.id)}>
                            <SelectTrigger className="w-64">
                              <SelectValue placeholder="Add user to team" />
                            </SelectTrigger>
                            <SelectContent>
                              {users.filter(u => !u.teams.includes(team.name)).map((user) => (
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
  )
})
