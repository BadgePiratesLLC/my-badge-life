import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, ExternalLink } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTeams } from '@/hooks/useTeams';

export const MyTeamManagement = memo(function MyTeamManagement() {
  const { profile } = useAuthContext();
  const { teams, users } = useTeams();

  const myTeam = teams.find(t => t.name === profile?.assigned_team);
  const teamMembers = users.filter(u => u.teams.includes(profile?.assigned_team || ''));

  if (!profile?.assigned_team || !myTeam) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-mono">
          <Users className="h-5 w-5" />
          MY TEAM
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold font-mono mb-2">{myTeam.name}</h3>
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
