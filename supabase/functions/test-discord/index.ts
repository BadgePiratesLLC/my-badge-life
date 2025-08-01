import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');
    console.log('Webhook URL configured:', !!webhookUrl);
    
    if (!webhookUrl) {
      return new Response(JSON.stringify({ 
        error: 'Discord webhook URL not configured',
        configured: false 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Test the webhook with a simple message
    const testPayload = {
      embeds: [{
        title: '🔧 Discord Test',
        description: 'Testing Discord webhook configuration for MyBadgeLife',
        color: 0x7289da,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'MyBadgeLife Test',
        },
      }],
    };

    console.log('Testing Discord webhook...');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord webhook test failed:', response.status, errorText);
      return new Response(JSON.stringify({
        error: `Discord webhook failed: ${response.status} - ${errorText}`,
        status: response.status,
        configured: true
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log('Discord webhook test successful');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Discord webhook is working correctly',
      configured: true 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error testing Discord webhook:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      configured: !!Deno.env.get('DISCORD_WEBHOOK_URL')
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);