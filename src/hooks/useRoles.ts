import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

export type AppRole = 'admin' | 'moderator' | 'user'

export function useRoles() {
  const [roles, setRoles] = useState<AppRole[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchUserRoles()
    } else {
      setRoles([])
      setLoading(false)
    }
  }, [user])

  const fetchUserRoles = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching roles:', error)
      } else {
        setRoles((data || []).map(r => r.role as AppRole))
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
    } finally {
      setLoading(false)
    }
  }

  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role)
  }

  const isAdmin = (): boolean => hasRole('admin')
  const isModerator = (): boolean => hasRole('moderator')
  const isUser = (): boolean => hasRole('user')

  const assignRole = async (userId: string, role: AppRole) => {
    if (!isAdmin()) throw new Error('Only admins can assign roles')

    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role })

    if (error) {
      console.error('Error assigning role:', error)
      throw error
    }
  }

  const removeRole = async (userId: string, role: AppRole) => {
    if (!isAdmin()) throw new Error('Only admins can remove roles')

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role)

    if (error) {
      console.error('Error removing role:', error)
      throw error
    }
  }

  return {
    roles,
    loading,
    hasRole,
    isAdmin,
    isModerator,
    isUser,
    assignRole,
    removeRole,
    refreshRoles: fetchUserRoles
  }
}