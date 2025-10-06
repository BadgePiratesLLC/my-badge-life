import React, { memo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Calendar, Clock, Users, Shield, UserPlus, Mail } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MakerRequestModal } from '@/components/MakerRequestModal';
import { EmailPreferencesSettings } from '@/components/EmailPreferencesSettings';
import { format } from 'date-fns';

interface TeamMembership {
  team_name: string;
}

interface PendingRequest {
  team_name: string;
  created_at: string;
}

export const MyProfile = memo(function MyProfile() {
  const { user, profile, getDisplayRole } = useAuthContext();
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [showMakerRequest, setShowMakerRequest] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTeamMemberships();
      fetchPendingRequests();
    }
  }, [user]);

  const fetchTeamMemberships = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          teams:team_id (
            name
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      
      const teams = data
        ?.map(m => ({ team_name: m.teams?.name }))
        .filter(t => t.team_name) || [];
      
      setTeamMemberships(teams as TeamMembership[]);
    } catch (error) {
      console.error('Error fetching team memberships:', error);
    }
  };

  const fetchPendingRequests = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('team_requests')
        .select('team_name, created_at')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingRequests(data || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  if (!user || !profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono">
            <User className="h-5 w-5" />
            MY PROFILE
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Loading profile...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono">
            <User className="h-5 w-5" />
            MY PROFILE
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">User Information</h3>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Display Name</p>
                    <p className="font-medium">{profile.display_name || 'Not set'}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{profile.email}</p>
                </div>
              </div>
            </div>

            {/* Role Information */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Role & Permissions</h3>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Badge variant="secondary" className="font-mono">
                  {getDisplayRole().toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Account Dates */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Account Information</h3>
              <div className="space-y-2">
                {profile.created_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Registered:</span>
                    <span className="font-medium">
                      {format(new Date(profile.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                )}
                {(profile as any).last_login && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Last Login:</span>
                    <span className="font-medium">
                      {format(new Date((profile as any).last_login), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Team Memberships */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Team Memberships</h3>
              {teamMemberships.length > 0 ? (
                <div className="space-y-2">
                  {teamMemberships.map((membership, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-muted rounded"
                    >
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{membership.team_name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not a member of any teams yet</p>
              )}
            </div>

            {/* Pending Team Requests */}
            {pendingRequests.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Pending Team Requests</h3>
                <div className="space-y-2">
                  {pendingRequests.map((request, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{request.team_name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Awaiting Approval
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Request Team Button */}
            <div className="border-t pt-4">
              <Button
                onClick={() => setShowMakerRequest(true)}
                className="w-full"
                variant="outline"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                REQUEST TO JOIN TEAM
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Request to join an existing team or create a new one
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Notification Settings */}
      <EmailPreferencesSettings />

      <MakerRequestModal 
        isOpen={showMakerRequest}
        onClose={() => {
          setShowMakerRequest(false);
          fetchPendingRequests();
        }}
      />
    </>
  );
});
