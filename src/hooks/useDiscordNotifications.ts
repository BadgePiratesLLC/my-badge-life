import { supabase } from '@/integrations/supabase/client';

export type NotificationType = 'badge_submitted' | 'user_registered' | 'maker_request' | 'badge_approved' | 'badge_rejected';

interface NotificationData {
  title: string;
  description: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  thumbnail?: {
    url: string;
  };
  url?: string; // Direct link to the badge or relevant page
  badge_id?: string; // Badge ID for generating direct links
}

export const useDiscordNotifications = () => {
  const sendNotification = async (type: NotificationType, data: NotificationData) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('send-discord-notification', {
        body: {
          type,
          data,
        },
      });

      if (error) {
        console.error('Error sending Discord notification:', error);
        throw error;
      }

      return result;
    } catch (error) {
      console.error('Failed to send Discord notification:', error);
      throw error;
    }
  };

  const notifyBadgeSubmitted = async (badge: {
    id?: string;
    name: string;
    team_name?: string;
    category?: string;
    year?: number;
    maker_name?: string;
    image_url?: string;
  }) => {
    const fields = [
      ...(badge.team_name ? [{ name: 'Team', value: badge.team_name, inline: true }] : []),
      ...(badge.category ? [{ name: 'Category', value: badge.category, inline: true }] : []),
      ...(badge.year ? [{ name: 'Year', value: badge.year.toString(), inline: true }] : []),
      ...(badge.maker_name ? [{ name: 'Maker', value: badge.maker_name, inline: true }] : []),
    ];

    return sendNotification('badge_submitted', {
      title: '🏆 New Badge Submitted',
      description: `A new badge **${badge.name}** has been submitted and is awaiting approval.`,
      fields,
      badge_id: badge.id,
      ...(badge.image_url ? { thumbnail: { url: badge.image_url } } : {}),
    });
  };

  const notifyUserRegistered = async (user: {
    display_name?: string;
    email?: string;
  }) => {
    return sendNotification('user_registered', {
      title: '👋 New User Registered',
      description: `Welcome **${user.display_name || user.email || 'New User'}** to MyBadgeLife!`,
      fields: [
        ...(user.email ? [{ name: 'Email', value: user.email, inline: true }] : []),
      ],
    });
  };

  const notifyMakerRequest = async (user: {
    display_name?: string;
    email?: string;
  }) => {
    return sendNotification('maker_request', {
      title: '🛠️ New Maker Request',
      description: `**${user.display_name || user.email || 'User'}** has requested maker status.`,
      fields: [
        ...(user.email ? [{ name: 'Email', value: user.email, inline: true }] : []),
      ],
    });
  };

  const notifyBadgeApproved = async (badge: {
    id?: string;
    name: string;
    team_name?: string;
    category?: string;
    image_url?: string;
  }) => {
    return sendNotification('badge_approved', {
      title: '✅ Badge Approved',
      description: `Badge **${badge.name}** has been approved and is now live!`,
      fields: [
        ...(badge.team_name ? [{ name: 'Team', value: badge.team_name, inline: true }] : []),
        ...(badge.category ? [{ name: 'Category', value: badge.category, inline: true }] : []),
      ],
      badge_id: badge.id,
      ...(badge.image_url ? { thumbnail: { url: badge.image_url } } : {}),
    });
  };

  const notifyBadgeRejected = async (badge: {
    id?: string;
    name: string;
    team_name?: string;
    reason?: string;
  }) => {
    return sendNotification('badge_rejected', {
      title: '❌ Badge Rejected',
      description: `Badge **${badge.name}** has been rejected.`,
      fields: [
        ...(badge.team_name ? [{ name: 'Team', value: badge.team_name, inline: true }] : []),
        ...(badge.reason ? [{ name: 'Reason', value: badge.reason, inline: false }] : []),
      ],
      badge_id: badge.id,
    });
  };

  return {
    sendNotification,
    notifyBadgeSubmitted,
    notifyUserRegistered,
    notifyMakerRequest,
    notifyBadgeApproved,
    notifyBadgeRejected,
  };
};