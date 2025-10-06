import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuthContext } from '@/contexts/AuthContext'

export type AppRole = 'admin' | 'moderator' | 'user'

export function useRoles() {
  const [roles, setRoles] = useState<AppRole[]>([])
  const [loading, setLoading] = useState(true)
  const { user, profile } = useAuthContext()

  const fetchUserRoles = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      if (error) throw error
      
      const fetchedRoles = (data || []).map(r => r.role as AppRole)
      setRoles(fetchedRoles)
    } catch (error) {
      console.error('Error fetching roles:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchUserRoles()
    } else {
      setRoles([])
      setLoading(false)
    }
  }, [user, fetchUserRoles])

  const hasRole = useCallback((role: AppRole): boolean => {
    return roles.includes(role)
  }, [roles])

  const isAdmin = useCallback((): boolean => hasRole('admin'), [hasRole])
  const isModerator = useCallback((): boolean => hasRole('moderator'), [hasRole])
  const isUser = useCallback((): boolean => hasRole('user'), [hasRole])

  const assignRole = useCallback(async (userId: string, role: AppRole) => {
    if (!isAdmin()) throw new Error('Only admins can assign roles')

    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role })

    if (error) throw error
  }, [isAdmin])

  const removeRole = useCallback(async (userId: string, role: AppRole) => {
    if (!isAdmin()) throw new Error('Only admins can remove roles')

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role)

    if (error) throw error
  }, [isAdmin])

  // Display role logic - moderator role in user_roles represents badge makers
  const getDisplayRole = useCallback(() => {
    if (isAdmin()) return 'Admin'
    
    // Note: 'moderator' in user_roles represents badge makers
    if (roles.includes('moderator')) {
      return 'Badge Maker'
    }
    
    // Legacy check for profile-based makers
    if (profile?.role === 'maker' && profile?.maker_approved) {
      return 'Badge Maker'
    }
    
    if (profile?.role === 'maker' && !profile?.maker_approved) {
      return 'Pending Badge Maker'
    }
    
    return 'User'
  }, [isAdmin, profile, roles])

  const getRoleVariant = useCallback((): "default" | "secondary" | "destructive" | "outline" => {
    const role = getDisplayRole()
    switch (role) {
      case 'Admin': return 'destructive'
      case 'Badge Maker': return 'default'
      case 'Pending Badge Maker': return 'secondary'
      default: return 'outline'
    }
  }, [getDisplayRole])

  const getAllUserRoles = useCallback((userProfile: any, userRoles: string[]) => {
    const displayRoles = []
    
    if (userRoles.includes('admin')) {
      displayRoles.push('Admin')
    }
    
    // Note: 'moderator' in user_roles represents badge makers
    if (userRoles.includes('moderator')) {
      displayRoles.push('Badge Maker')
    }
    
    // Legacy check for profile-based makers
    if (userProfile?.role === 'maker') {
      if (userProfile.maker_approved && !userRoles.includes('moderator')) {
        displayRoles.push('Badge Maker')
      } else if (!userProfile.maker_approved && !userRoles.includes('moderator')) {
        displayRoles.push('Pending Badge Maker')
      }
    }
    
    if (userRoles.includes('user') && displayRoles.length === 0) {
      displayRoles.push('User')
    }
    
    if (displayRoles.length === 0) {
      displayRoles.push('User')
    }
    
    return displayRoles
  }, [])

  return {
    roles,
    loading,
    hasRole,
    isAdmin,
    isModerator,
    isUser,
    assignRole,
    removeRole,
    refreshRoles: fetchUserRoles,
    // Display helpers
    getDisplayRole,
    getRoleVariant,
    getAllUserRoles,
  }
}