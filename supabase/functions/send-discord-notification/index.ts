import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiscordNotificationRequest {
  type: 'badge_submitted' | 'user_registered' | 'maker_request' | 'badge_approved' | 'badge_rejected';
  data: {
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
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');
    if (!webhookUrl) {
      throw new Error('Discord webhook URL not configured');
    }

    const { type, data }: DiscordNotificationRequest = await req.json();
    
    // Generate badge URL if badge_id is provided
    let badgeUrl = data.url;
    if (!badgeUrl && data.badge_id) {
      // Construct direct badge link - using the correct production domain
      badgeUrl = `https://mybadgelife.com/?badge=${data.badge_id}`;
    }
    
    // Set default colors for different notification types
    const typeColors = {
      badge_submitted: 0x3498db,  // Blue
      user_registered: 0x2ecc71,  // Green
      maker_request: 0xf39c12,    // Orange
      badge_approved: 0x27ae60,   // Dark green
      badge_rejected: 0xe74c3c,   // Red
    };

    const embed = {
      title: data.title,
      description: data.description,
      color: data.color || typeColors[type] || 0x7289da,
      timestamp: new Date().toISOString(),
      fields: data.fields || [],
      footer: {
        text: 'MyBadgeLife Notifications',
      },
      ...(badgeUrl ? { url: badgeUrl } : {}), // Add clickable link to embed title
    };

    // Only add thumbnail if it's a valid HTTP/HTTPS URL (not blob URLs)
    if (data.thumbnail?.url && (data.thumbnail.url.startsWith('http://') || data.thumbnail.url.startsWith('https://'))) {
      embed.thumbnail = data.thumbnail;
    }

    // Add "View Badge" button if we have a badge URL
    const components = badgeUrl ? [{
      type: 1, // Action Row
      components: [{
        type: 2, // Button
        style: 5, // Link style
        label: type.includes('badge') ? '🔗 View Badge' : '🔗 View App',
        url: badgeUrl
      }]
    }] : [];

    const discordPayload = {
      embeds: [embed],
      ...(components.length > 0 ? { components } : {}),
    };

    console.log('Sending Discord notification:', { type, embed });

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(discordPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook failed: ${response.status} - ${errorText}`);
    }

    console.log('Discord notification sent successfully');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error in send-discord-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);