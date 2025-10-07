import React, { memo, useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Users, ExternalLink, Edit, Save, X } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Team {
  id: string;
  name: string;
  description: string | null;
  website_url: string | null;
}

interface TeamMember {
  display_name: string | null;
  email: string | null;
}

export const MyTeamManagement = memo(function MyTeamManagement() {
  const { profile, user } = useAuthContext();
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ 
    description: '', 
    website_url: '' 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile?.assigned_team) {
      fetchTeamData();
    } else {
      setLoading(false);
    }
  }, [user, profile?.assigned_team]);

  const fetchTeamData = async () => {
    if (!profile?.assigned_team) return;
    
    try {
      setLoading(true);
      
      // Fetch team info
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('name', profile.assigned_team)
        .maybeSingle();

      if (teamError) throw teamError;
      
      if (teamData) {
        setMyTeam(teamData);
        
        // Fetch team members - get user IDs first
        const { data: memberIds, error: membersError } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', teamData.id);

        if (membersError) throw membersError;
        
        if (memberIds && memberIds.length > 0) {
          const userIds = memberIds.map(m => m.user_id);
          
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('display_name, email')
            .in('id', userIds);
            
          if (profilesError) throw profilesError;
          
          setTeamMembers(profiles || []);
        } else {
          setTeamMembers([]);
        }
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = useCallback(() => {
    if (myTeam) {
      setEditForm({
        description: myTeam.description || '',
        website_url: myTeam.website_url || ''
      });
      setIsEditing(true);
    }
  }, [myTeam]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditForm({ description: '', website_url: '' });
  }, []);

  const saveEdit = useCallback(async () => {
    if (!myTeam) return;
    
    try {
      const { data, error } = await supabase
        .from('teams')
        .update({
          description: editForm.description.trim() || null,
          website_url: editForm.website_url.trim() || null
        })
        .eq('id', myTeam.id)
        .select()
        .single();

      if (error) throw error;
      
      setMyTeam(data);
      setIsEditing(false);
      toast.success('Team updated successfully!');
    } catch (error) {
      console.error('Error updating team:', error);
      toast.error('Failed to update team');
    }
  }, [myTeam, editForm]);

  if (loading) {
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
            Loading...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!profile?.assigned_team) {
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
            {teamMembers.map((member, index) => (
              <div
                key={index}
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
