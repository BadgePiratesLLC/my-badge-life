import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export interface Team {
  id: string
  name: string
  description: string | null
  website_url: string | null
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  created_at: string
  teams?: {
    name: string
  } | null
}

export interface UserWithTeams {
  id: string
  email: string | null
  display_name: string | null
  teams: string[]
}

export interface TeamRequest {
  id: string
  user_id: string
  team_name: string
  team_description: string | null
  team_website_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  reviewed_by: string | null
  reviewed_at: string | null
}

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [users, setUsers] = useState<UserWithTeams[]>([])
  const [teamRequests, setTeamRequests] = useState<TeamRequest[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthContext()
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      fetchTeams()
      fetchTeamMembers()
      fetchUsers()
      fetchTeamRequests()
    }
  }, [user])

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name')

      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      console.error('Error fetching teams:', error)
      toast({
        title: 'Error',
        description: 'Failed to load teams',
        variant: 'destructive'
      })
    }
  }

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          teams:team_id (
            name
          )
        `)

      if (error) throw error
      setTeamMembers(data || [])
    } catch (error) {
      console.error('Error fetching team members:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('display_name')

      if (error) throw error

      // Get team memberships for each user
      const usersWithTeams: UserWithTeams[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: memberships } = await supabase
            .from('team_members')
            .select(`
              teams:team_id (
                name
              )
            `)
            .eq('user_id', profile.id)

          const teamNames = memberships?.map(m => m.teams?.name).filter(Boolean) || []

          return {
            id: profile.id,
            email: profile.email,
            display_name: profile.display_name,
            teams: teamNames as string[]
          }
        })
      )

      setUsers(usersWithTeams)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const createTeam = async (name: string, description?: string, websiteUrl?: string) => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name,
          description: description || null,
          website_url: websiteUrl || null
        })
        .select()
        .single()

      if (error) throw error

      setTeams(prev => [...prev, data])
      toast({
        title: 'Success',
        description: 'Team created successfully'
      })

      return data
    } catch (error: any) {
      console.error('Error creating team:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to create team',
        variant: 'destructive'
      })
      throw error
    }
  }

  const updateTeam = async (teamId: string, updates: { name?: string; description?: string; website_url?: string }) => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', teamId)
        .select()
        .single()

      if (error) throw error

      setTeams(prev => prev.map(team => 
        team.id === teamId ? { ...team, ...data } : team
      ))

      toast({
        title: 'Success',
        description: 'Team updated successfully'
      })

      return data
    } catch (error: any) {
      console.error('Error updating team:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update team',
        variant: 'destructive'
      })
      throw error
    }
  }

  const deleteTeam = async (teamId: string) => {
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)

      if (error) throw error

      setTeams(prev => prev.filter(team => team.id !== teamId))
      setTeamMembers(prev => prev.filter(member => member.team_id !== teamId))
      
      toast({
        title: 'Success',
        description: 'Team deleted successfully'
      })
    } catch (error: any) {
      console.error('Error deleting team:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete team',
        variant: 'destructive'
      })
      throw error
    }
  }

  const addUserToTeam = async (userId: string, teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .insert({
          user_id: userId,
          team_id: teamId
        })
        .select(`
          *,
          teams:team_id (
            name
          )
        `)
        .single()

      if (error) throw error

      setTeamMembers(prev => [...prev, data])
      await fetchUsers() // Refresh users to update team assignments

      toast({
        title: 'Success',
        description: 'User added to team successfully'
      })

      return data
    } catch (error: any) {
      console.error('Error adding user to team:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to add user to team',
        variant: 'destructive'
      })
      throw error
    }
  }

  const removeUserFromTeam = async (userId: string, teamId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', userId)
        .eq('team_id', teamId)

      if (error) throw error

      setTeamMembers(prev => prev.filter(member => 
        !(member.user_id === userId && member.team_id === teamId)
      ))
      await fetchUsers() // Refresh users to update team assignments

      toast({
        title: 'Success',
        description: 'User removed from team successfully'
      })
    } catch (error: any) {
      console.error('Error removing user from team:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove user from team',
        variant: 'destructive'
      })
      throw error
    }
  }

  const fetchTeamRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('team_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTeamRequests((data || []) as TeamRequest[])
    } catch (error) {
      console.error('Error fetching team requests:', error)
    }
  }

  const createTeamRequest = async (
    name: string,
    description?: string,
    websiteUrl?: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('team_requests')
        .insert({
          user_id: user?.id,
          team_name: name,
          team_description: description || null,
          team_website_url: websiteUrl || null,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      setTeamRequests(prev => [data as TeamRequest, ...prev])

      // Send Discord notification
      await supabase.functions.invoke('send-discord-notification', {
        body: {
          type: 'team_request',
          data: {
            title: '🏢 New Team Creation Request',
            description: `**${user?.email}** has requested to create a new team: **${name}**`,
            fields: [
              ...(description ? [{ name: 'Description', value: description, inline: false }] : []),
              ...(websiteUrl ? [{ name: 'Website', value: websiteUrl, inline: false }] : []),
            ],
          },
        },
      })

      // Send email notification
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'team_request',
          to: 'flightgod@gmail.com',
          data: {
            userName: user?.email,
            teamName: name,
            teamDescription: description,
            teamWebsite: websiteUrl,
          },
        },
      })

      toast({
        title: 'Request Submitted',
        description: 'Your team creation request has been sent to admins for approval.'
      })

      return data
    } catch (error: any) {
      console.error('Error creating team request:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit team request',
        variant: 'destructive'
      })
      throw error
    }
  }

  const approveTeamRequest = async (requestId: string) => {
    try {
      // Get the request details
      const { data: request, error: fetchError } = await supabase
        .from('team_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (fetchError) throw fetchError

      // Create the team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: request.team_name,
          description: request.team_description,
          website_url: request.team_website_url
        })
        .select()
        .single()

      if (teamError) throw teamError

      // Add the user to the team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: request.user_id
        })

      if (memberError) throw memberError

      // Update request status
      const { error: updateError } = await supabase
        .from('team_requests')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (updateError) throw updateError

      await Promise.all([
        fetchTeams(),
        fetchTeamMembers(),
        fetchUsers(),
        fetchTeamRequests()
      ])

      toast({
        title: 'Success',
        description: 'Team request approved and team created'
      })

      return team
    } catch (error: any) {
      console.error('Error approving team request:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve team request',
        variant: 'destructive'
      })
      throw error
    }
  }

  const rejectTeamRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('team_requests')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (error) throw error

      await fetchTeamRequests()

      toast({
        title: 'Success',
        description: 'Team request rejected'
      })
    } catch (error: any) {
      console.error('Error rejecting team request:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject team request',
        variant: 'destructive'
      })
      throw error
    }
  }

  return {
    teams,
    teamMembers,
    users,
    teamRequests,
    loading,
    createTeam,
    updateTeam,
    deleteTeam,
    addUserToTeam,
    removeUserFromTeam,
    createTeamRequest,
    approveTeamRequest,
    rejectTeamRequest,
    refreshTeams: fetchTeams,
    refreshMembers: fetchTeamMembers,
    refreshUsers: fetchUsers,
    refreshTeamRequests: fetchTeamRequests
  }
}