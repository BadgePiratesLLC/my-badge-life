import React, { memo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Users, ExternalLink, Edit, Save, X } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTeams } from '@/hooks/useTeams';
import { toast } from 'sonner';

export const MyTeamManagement = memo(function MyTeamManagement() {
  console.log('🟢 MyTeamManagement COMPONENT RENDERING');
  const { profile } = useAuthContext();
  const { teams, users, updateTeam, refreshTeams, refreshUsers, loading } = useTeams();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ 
    description: '', 
    website_url: '' 
  });

  console.log('🟢 MyTeamManagement state:', { 
    profileEmail: profile?.email, 
    assignedTeam: profile?.assigned_team,
    teamsCount: teams.length,
    usersCount: users.length,
    loading 
  });

  // Refresh data when component mounts
  React.useEffect(() => {
    console.log('MyTeamManagement mounted, refreshing data...');
    refreshTeams();
    refreshUsers();
  }, []);

  const myTeam = teams.find(t => t.name === profile?.assigned_team);
  
  // Filter team members: users who have this team in their teams array
  const teamMembers = users.filter(u => {
    const hasTeamInArray = u.teams?.includes(profile?.assigned_team || '');
    return hasTeamInArray;
  });

  // Debug logging
  React.useEffect(() => {
    if (profile?.assigned_team) {
      console.log('MyTeamManagement mounted:', {
        profileAssignedTeam: profile?.assigned_team,
        teamsCount: teams.length,
        myTeam: myTeam,
        usersCount: users.length,
        teamMembersCount: teamMembers.length,
        teamMembersData: teamMembers
      });
    }
  }, [profile?.assigned_team, teams.length, users.length, myTeam, teamMembers]);

  if (!profile?.assigned_team) {
    console.log('No assigned team for profile:', profile);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono">
            <Users className="h-5 w-5" />
            MY TEAM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            You are not currently assigned to a team.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!myTeam) {
    console.log('Team not found:', { 
      assignedTeam: profile.assigned_team,
      availableTeams: teams.map(t => t.name)
    });
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono">
            <Users className="h-5 w-5" />
            MY TEAM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Team "{profile.assigned_team}" not found. Please contact an administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  const startEdit = useCallback(() => {
    setEditForm({
      description: myTeam.description || '',
      website_url: myTeam.website_url || ''
    });
    setIsEditing(true);
  }, [myTeam]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditForm({ description: '', website_url: '' });
  }, []);

  const saveEdit = useCallback(async () => {
    try {
      await updateTeam(myTeam.id, {
        description: editForm.description.trim() || undefined,
        website_url: editForm.website_url.trim() || undefined
      });
      setIsEditing(false);
      toast.success('Team updated successfully!');
    } catch (error) {
      toast.error('Failed to update team');
    }
  }, [myTeam.id, editForm, updateTeam]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-mono">
          <Users className="h-5 w-5" />
          MY TEAM
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold font-mono mb-2">{myTeam.name}</h3>
            
            {isEditing ? (
              <div className="space-y-3 mb-4">
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Team description"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Website URL</Label>
                  <Input
                    type="url"
                    value={editForm.website_url}
                    onChange={(e) => setEditForm(prev => ({ ...prev, website_url: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {myTeam.description && (
                  <p className="text-sm text-muted-foreground mb-2">{myTeam.description}</p>
                )}
                {myTeam.website_url && (
                  <a
                    href={myTeam.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {myTeam.website_url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </>
            )}
          </div>
          
          {!isEditing && (
            <Button size="sm" variant="outline" onClick={startEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-3 font-mono">
            TEAM MEMBERS ({teamMembers.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-2 bg-muted rounded"
              >
                <span className="text-sm">{member.display_name || member.email}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4 bg-muted/30 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> You can manage badges for your team ({myTeam.name}) in the Badge Management tab. 
            Only badges assigned to your team will be editable.
          </p>
        </div>
      </CardContent>
    </Card>
  );
});
