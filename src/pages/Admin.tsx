import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useBadges } from '@/hooks/useBadges'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Shield, Bug, Image, Settings, Users, Mail, BarChart3 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useTeams } from '@/hooks/useTeams'
import { WebSearchTester } from '@/components/WebSearchTester'
import { AdminAnalytics } from '@/components/AdminAnalytics'
import { EmailTriggerTester } from '@/components/EmailTriggerTester'
import { useIsMobile } from '@/hooks/use-mobile'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { UploadsManagement } from '@/components/admin/UploadsManagement'
import { BadgeManagement } from '@/components/admin/BadgeManagement'
import { TeamManagement } from '@/components/admin/TeamManagement'
import { UserManagement } from '@/components/admin/UserManagement'
import { TeamRequestsManagement } from '@/components/admin/TeamRequestsManagement'
import { ApiKeysStatus } from '@/components/admin/ApiKeysStatus'
import { AdminNotificationBell } from '@/components/admin/AdminNotificationBell'

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

interface Upload {
  id: string
  user_id: string | null
  image_url: string
  created_at: string
  badge_name?: string | null
  badge_description?: string | null
  badge_year?: number | null
  badge_maker?: string | null
  badge_category?: string | null
  badge_external_link?: string | null
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
  const isMobile = useIsMobile()
  const { user, profile, loading: authLoading, isAdmin, canAccessAdmin, canManageUsers, canManageTeams, canManageBadges, canEditBadge } = useAuthContext()
  const { refreshBadges } = useBadges()
  const { 
    teams, 
    users: teamUsers, 
    teamRequests,
    createTeam, 
    updateTeam, 
    deleteTeam, 
    addUserToTeam, 
    removeUserFromTeam,
    approveTeamRequest,
    rejectTeamRequest
  } = useTeams()
  const navigate = useNavigate()
  const [uploads, setUploads] = useState<Upload[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [badges, setBadges] = useState<BadgeData[]>([])
  const [loading, setLoading] = useState(true)
  const [usersFetched, setUsersFetched] = useState(false)
  const [activeTab, setActiveTab] = useState('badges')

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      if (!authLoading && user && profile) {
        if (canAccessAdmin) {
          fetchUploads()
          if (!usersFetched && canManageUsers) {
            fetchUsers()
          }
          fetchBadges()
        }
        setLoading(false)
      } else if (!authLoading && !user) {
        setLoading(false)
      }
    }
    
    checkAuthAndLoad()
  }, [authLoading, usersFetched, user, profile, canAccessAdmin, canManageUsers])

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
    } catch (error: any) {
      toast.error('Failed to load uploads')
    }
  }

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, display_name, assigned_team')

      if (profilesError) {
        setUsers([])
        return
      }

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')

      if (rolesError) {
        // Continue without roles data
      }

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
    } catch (error: any) {
      setUsers([])
      setUsersFetched(true)
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
    } catch (error: any) {
      toast.error('Failed to load badges')
    }
  }

  const saveBadgeEdit = useCallback(async (badgeId: string, updates: Partial<BadgeData>) => {
    try {
      const { error } = await supabase
        .from('badges')
        .update({
          name: updates.name,
          description: updates.description || null,
          year: updates.year || null,
          image_url: updates.image_url || null,
          external_link: updates.external_link || null,
          team_name: updates.team_name || null,
          category: updates.category as any,
          retired: updates.retired
        })
        .eq('id', badgeId)

      if (error) throw error

      setBadges(prev => prev.map(badge => 
        badge.id === badgeId 
          ? { ...badge, ...updates, updated_at: new Date().toISOString() }
          : badge
      ))

      toast.success('Badge updated successfully!')
    } catch (error: any) {
      toast.error('Failed to update badge')
    }
  }, [])

  const createBadgeFromUpload = useCallback((upload: Upload) => {
    const params = new URLSearchParams();
    params.set('image_url', upload.image_url);
    params.set('upload_id', upload.id);
    
    if (upload.badge_name) params.set('name', upload.badge_name);
    if (upload.badge_description) params.set('description', upload.badge_description);
    if (upload.badge_year) params.set('year', upload.badge_year.toString());
    if (upload.badge_maker) params.set('maker', upload.badge_maker);
    if (upload.badge_category) params.set('category', upload.badge_category);
    if (upload.badge_external_link) params.set('external_link', upload.badge_external_link);
    
    navigate(`/badge/register?${params.toString()}`);
  }, [navigate])

  const associateImageWithBadge = useCallback(async (imageUrl: string, badgeId: string) => {
    try {
      const { error } = await supabase
        .from('badge_images')
        .insert({
          badge_id: badgeId,
          image_url: imageUrl,
          display_order: 0,
        })

      if (error) throw error

      toast.success('Image associated with badge successfully!')
      fetchUploads()
    } catch (error: any) {
      toast.error('Failed to associate image with badge')
    }
  }, [])

  const deleteBadge = useCallback(async (badge: BadgeData) => {
    if (!confirm('Are you sure you want to delete this badge? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('badges')
        .delete()
        .eq('id', badge.id)

      if (error) throw error

      setBadges(prev => prev.filter(b => b.id !== badge.id))
      refreshBadges()
      
      toast.success('Badge deleted successfully!')
    } catch (error: any) {
      toast.error('Failed to delete badge')
    }
  }, [refreshBadges])

  const deleteUpload = useCallback(async (upload: Upload) => {
    if (!confirm('Are you sure you want to delete this upload?')) return

    try {
      const { error: dbError } = await supabase
        .from('uploads')
        .delete()
        .eq('id', upload.id)

      if (dbError) {
        toast.error('Failed to delete upload: ' + dbError.message)
        return
      }

      setUploads(prev => prev.filter(u => u.id !== upload.id))
      toast.success('Upload deleted successfully!')
    } catch (error: any) {
      toast.error('Failed to delete upload: ' + error.message)
    }
  }, [])

  const handleRoleChange = useCallback(() => {
    setUsersFetched(false)
    fetchUsers()
  }, [])

  if (authLoading || loading) {
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

  if (!canAccessAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center font-mono text-red-500">INSUFFICIENT PRIVILEGES</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              {profile?.role === 'maker' && !profile?.maker_approved 
                ? 'Your badge maker request is pending approval.' 
                : 'Admin or Badge Maker access required.'
              }
            </p>
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
      {/* Admin Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-3">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold font-mono">
                {isAdmin ? 'ADMIN PANEL' : 'BADGE MAKER PANEL'}
              </h1>
              <span className="text-xs text-muted-foreground">Badge Management System</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isAdmin && (
              <AdminNotificationBell onNavigateToTab={setActiveTab} />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open('https://github.com/BadgePiratesLLC/my-badge-life/issues/new?template=bug_report.md', '_blank')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Bug className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-muted-foreground">
              {isAdmin ? 'Manage badges and users' : 'Manage badges for your team'}
            </p>
          </div>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to App
            </Button>
          </Link>
        </div>

        <TooltipProvider>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full ${canManageUsers && canManageTeams ? 'grid-cols-7' : 'grid-cols-5'}`}>
              {canAccessAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="uploads" className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      {!isMobile && "Uploaded Images"}
                    </TabsTrigger>
                  </TooltipTrigger>
                  {isMobile && (
                    <TooltipContent>
                      <p>Uploaded Images</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              )}
              {canManageBadges && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="badges" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      {!isMobile && "Badge Management"}
                    </TabsTrigger>
                  </TooltipTrigger>
                  {isMobile && (
                    <TooltipContent>
                      <p>Badge Management</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              )}
              {canManageTeams && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="teams" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {!isMobile && "Team Management"}
                    </TabsTrigger>
                  </TooltipTrigger>
                  {isMobile && (
                    <TooltipContent>
                      <p>Team Management</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              )}
              {canManageUsers && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="users" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {!isMobile && "User Management"}
                    </TabsTrigger>
                  </TooltipTrigger>
                  {isMobile && (
                    <TooltipContent>
                      <p>User Management</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              )}
              {canAccessAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="search" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      {!isMobile && "Settings"}
                    </TabsTrigger>
                  </TooltipTrigger>
                  {isMobile && (
                    <TooltipContent>
                      <p>Settings</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              )}
              {canAccessAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="emails" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {!isMobile && "Email Testing"}
                    </TabsTrigger>
                  </TooltipTrigger>
                  {isMobile && (
                    <TooltipContent>
                      <p>Email Testing</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              )}
              {canAccessAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="analytics" className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      {!isMobile && "Analytics"}
                    </TabsTrigger>
                  </TooltipTrigger>
                  {isMobile && (
                    <TooltipContent>
                      <p>Analytics</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              )}
            </TabsList>

            <TabsContent value="uploads" className="space-y-4">
              <UploadsManagement
                uploads={uploads}
                badges={badges}
                onCreateBadge={createBadgeFromUpload}
                onAssociateImage={associateImageWithBadge}
                onDeleteUpload={deleteUpload}
              />
            </TabsContent>

            <TabsContent value="badges" className="space-y-4">
              <BadgeManagement
                badges={badges}
                teams={teams}
                canEditBadge={canEditBadge}
                onSaveBadge={saveBadgeEdit}
                onDeleteBadge={deleteBadge}
              />
            </TabsContent>

            {canManageTeams && (
              <TabsContent value="teams" className="space-y-4">
                <TeamRequestsManagement
                  teamRequests={teamRequests}
                  onApprove={approveTeamRequest}
                  onReject={rejectTeamRequest}
                />
                <TeamManagement
                  teams={teams}
                  users={teamUsers}
                  teamRequests={teamRequests}
                  onCreateTeam={createTeam}
                  onUpdateTeam={updateTeam}
                  onDeleteTeam={deleteTeam}
                  onAddUserToTeam={addUserToTeam}
                  onRemoveUserFromTeam={removeUserFromTeam}
                />
              </TabsContent>
            )}

            {canManageUsers && (
              <TabsContent value="users" className="space-y-4">
                <UserManagement
                  users={users}
                  onRoleChange={handleRoleChange}
                />
              </TabsContent>
            )}

            {canAccessAdmin && (
              <TabsContent value="search" className="space-y-6">
                <ApiKeysStatus />
                <WebSearchTester />
              </TabsContent>
            )}

            {canAccessAdmin && (
              <TabsContent value="emails" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-mono">
                      <Mail className="h-5 w-5" />
                      EMAIL TESTING
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EmailTriggerTester />
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {isAdmin && (
              <TabsContent value="analytics" className="space-y-4">
                <AdminAnalytics />
              </TabsContent>
            )}
          </Tabs>
        </TooltipProvider>
      </div>
    </div>
  )
}
