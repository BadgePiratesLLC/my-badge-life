import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import type { TeamRequest } from '@/hooks/useTeams';

interface NotificationCounts {
  teamRequests: number;
  newUploads: number;
  recentUsers: number;
}

interface AdminNotificationBellProps {
  onNavigateToTab?: (tab: string) => void;
}

export const AdminNotificationBell: React.FC<AdminNotificationBellProps> = ({ onNavigateToTab }) => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<NotificationCounts>({
    teamRequests: 0,
    newUploads: 0,
    recentUsers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotificationCounts();
    
    // Set up real-time subscriptions
    const teamRequestsChannel = supabase
      .channel('team-requests-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'team_requests' 
        }, 
        () => {
          fetchNotificationCounts();
        }
      )
      .subscribe();

    const uploadsChannel = supabase
      .channel('uploads-changes')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'uploads'
        },
        () => {
          fetchNotificationCounts();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel('profiles-changes')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchNotificationCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(teamRequestsChannel);
      supabase.removeChannel(uploadsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  const fetchNotificationCounts = async () => {
    try {
      // Get pending team requests
      const { data: teamRequests, error: teamError } = await supabase
        .from('team_requests')
        .select('id')
        .eq('status', 'pending');

      // Get uploads from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: uploads, error: uploadsError } = await supabase
        .from('uploads')
        .select('id')
        .gte('created_at', sevenDaysAgo.toISOString());

      // Get users registered in last 7 days
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .gte('created_at', sevenDaysAgo.toISOString());

      if (!teamError && !uploadsError && !profilesError) {
        setCounts({
          teamRequests: teamRequests?.length || 0,
          newUploads: uploads?.length || 0,
          recentUsers: profiles?.length || 0
        });
      }
    } catch (error) {
      console.error('Error fetching notification counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalCount = counts.teamRequests + counts.newUploads + counts.recentUsers;

  const handleItemClick = (tab: string) => {
    if (onNavigateToTab) {
      onNavigateToTab(tab);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalCount > 9 ? '9+' : totalCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="font-mono">ADMIN NOTIFICATIONS</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {loading ? (
          <DropdownMenuItem disabled>
            Loading...
          </DropdownMenuItem>
        ) : totalCount === 0 ? (
          <DropdownMenuItem disabled>
            No new notifications
          </DropdownMenuItem>
        ) : (
          <>
            {counts.teamRequests > 0 && (
              <DropdownMenuItem 
                onClick={() => handleItemClick('teams')}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span>Pending Team Requests</span>
                  <Badge variant="destructive">{counts.teamRequests}</Badge>
                </div>
              </DropdownMenuItem>
            )}
            
            {counts.newUploads > 0 && (
              <DropdownMenuItem 
                onClick={() => handleItemClick('uploads')}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span>New Badge Uploads (7d)</span>
                  <Badge variant="secondary">{counts.newUploads}</Badge>
                </div>
              </DropdownMenuItem>
            )}
            
            {counts.recentUsers > 0 && (
              <DropdownMenuItem 
                onClick={() => handleItemClick('users')}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span>New User Registrations (7d)</span>
                  <Badge variant="secondary">{counts.recentUsers}</Badge>
                </div>
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
