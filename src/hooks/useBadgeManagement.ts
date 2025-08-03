import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useDiscordNotifications } from './useDiscordNotifications'
import { toast } from 'sonner'

interface BadgeApprovalData {
  id: string
  name: string
  maker_id?: string
  team_name?: string
  category?: string
  image_url?: string
}

export function useBadgeManagement() {
  const { user } = useAuth()
  const { notifyBadgeApproved, notifyBadgeRejected } = useDiscordNotifications()

  const approveBadge = async (badge: BadgeApprovalData, approverNotes?: string) => {
    if (!user) throw new Error('Must be logged in')

    try {
      // Here you could update a status field if you had one, 
      // but for now we'll just send notifications

      // Get badge maker info for email
      let makerProfile = null
      if (badge.maker_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', badge.maker_id)
          .single()
        
        makerProfile = profileData
      }

      // Send Discord notification
      await notifyBadgeApproved({
        id: badge.id,
        name: badge.name,
        team_name: badge.team_name,
        category: badge.category,
        image_url: badge.image_url
      })

      // Send email notification to badge creator
      if (makerProfile?.email) {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'badge_approved',
            to: makerProfile.email,
            data: {
              badgeName: badge.name,
              makerName: makerProfile.display_name || makerProfile.email,
              teamName: badge.team_name,
              category: badge.category,
              imageUrl: badge.image_url,
              badgeUrl: `${window.location.origin}/?badge=${badge.id}`,
              exploreUrl: `${window.location.origin}/`,
              userId: badge.maker_id
            }
          }
        })
      }

      toast.success(`Badge "${badge.name}" approved successfully!`)
      
    } catch (error) {
      console.error('Error approving badge:', error)
      toast.error('Failed to approve badge')
      throw error
    }
  }

  const rejectBadge = async (badge: BadgeApprovalData, rejectionReason: string) => {
    if (!user) throw new Error('Must be logged in')

    try {
      // Get badge maker info for email
      let makerProfile = null
      if (badge.maker_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', badge.maker_id)
          .single()
        
        makerProfile = profileData
      }

      // Send Discord notification
      await notifyBadgeRejected({
        id: badge.id,
        name: badge.name,
        team_name: badge.team_name,
        reason: rejectionReason
      })

      // Send email notification to badge creator
      if (makerProfile?.email) {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'badge_rejected',
            to: makerProfile.email,
            data: {
              badgeName: badge.name,
              makerName: makerProfile.display_name || makerProfile.email,
              teamName: badge.team_name,
              category: badge.category,
              imageUrl: badge.image_url,
              rejectionReason: rejectionReason,
              guidelinesUrl: `${window.location.origin}/guidelines`,
              submitUrl: `${window.location.origin}/badge/register`,
              userId: badge.maker_id
            }
          }
        })
      }

      toast.success(`Badge "${badge.name}" rejection notification sent`)
      
    } catch (error) {
      console.error('Error rejecting badge:', error)
      toast.error('Failed to send rejection notification')
      throw error
    }
  }

  const approveMakerRequest = async (userId: string, userEmail: string, userName?: string) => {
    if (!user) throw new Error('Must be logged in')

    try {
      // Update user profile to approve maker status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          maker_approved: true,
          role: 'maker'
        })
        .eq('id', userId)

      if (updateError) throw updateError

      // Send welcome email to new maker
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'badge_approved', // Reuse approved template with custom messaging
          to: userEmail,
          data: {
            badgeName: 'Maker Status',
            makerName: userName || userEmail,
            teamName: 'MyBadgeLife Team',
            category: 'Maker Approval',
            badgeUrl: `${window.location.origin}/badge/register`,
            exploreUrl: `${window.location.origin}/`,
            userId: userId
          }
        }
      })

      toast.success(`Maker request approved for ${userName || userEmail}`)
      
    } catch (error) {
      console.error('Error approving maker request:', error)
      toast.error('Failed to approve maker request')
      throw error
    }
  }

  return {
    approveBadge,
    rejectBadge,
    approveMakerRequest
  }
}