import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'
import { Resend } from "npm:resend@4.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import React from "npm:react@18.3.1";

// Import email templates
import { BadgeSubmittedEmail } from "./_templates/badge-submitted.tsx";
import { BadgeApprovedEmail } from "./_templates/badge-approved.tsx";
import { BadgeRejectedEmail } from "./_templates/badge-rejected.tsx";
import { WelcomeUserEmail } from "./_templates/welcome-user.tsx";
import { MakerRequestEmail } from "./_templates/maker-request.tsx";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: 'badge_submitted' | 'badge_approved' | 'badge_rejected' | 'welcome_user' | 'maker_request';
  to: string;
  data: any;
}

interface ApiLogData {
  api_provider: string;
  endpoint: string;
  method: string;
  response_status: number;
  response_time_ms: number;
  estimated_cost_usd: number;
  success: boolean;
  user_id?: string;
  session_id?: string;
}

async function logApiCall(logData: ApiLogData) {
  try {
    await supabase.from('api_call_logs').insert(logData);
  } catch (error) {
    console.error('Failed to log API call:', error);
  }
}

async function checkEmailPreferences(userId: string, emailType: string): Promise<boolean> {
  try {
    // Always send welcome emails and critical notifications regardless of preferences
    if (['welcome_user', 'password_reset', 'security_alert'].includes(emailType)) {
      return true;
    }

    const { data, error } = await supabase
      .from('email_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // If no preferences found, default to NOT sending emails (opt-in system)
      return false;
    }

    switch (emailType) {
      case 'badge_submitted':
        return data.badge_submission_notifications;
      case 'badge_approved':
      case 'badge_rejected':
        return data.badge_approval_notifications;
      case 'maker_request':
        return data.system_announcements;
      default:
        return false; // Default to not sending for unknown types
    }
  } catch (error) {
    console.error('Error checking email preferences:', error);
    return false; // Default to not sending if there's an error
  }
}

const handler = async (req: Request): Promise<Response> => {
  const startTime = Date.now();
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, data }: EmailRequest = await req.json();
    
    console.log(`Processing email request: ${type} to ${to}`);

    // Check email preferences for user-specific emails (except welcome emails which are always sent)
    if (data.userId && !['welcome_user', 'password_reset', 'security_alert'].includes(type)) {
      const shouldSend = await checkEmailPreferences(data.userId, type);
      if (!shouldSend) {
        console.log(`Email skipped due to user preferences: ${type} for ${data.userId}`);
        return new Response(
          JSON.stringify({ message: 'Email skipped due to user preferences' }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    let emailComponent;
    let subject;
    let fromName = "MyBadgeLife";

    switch (type) {
      case 'badge_submitted':
        emailComponent = React.createElement(BadgeSubmittedEmail, {
          badgeName: data.badgeName,
          makerName: data.makerName,
          makerEmail: data.makerEmail,
          teamName: data.teamName,
          category: data.category,
          description: data.description,
          imageUrl: data.imageUrl,
          adminUrl: data.adminUrl || `${supabaseUrl.replace('.supabase.co', '')}.lovable.app/admin`
        });
        subject = `🎫 New Badge Submission: ${data.badgeName}`;
        fromName = "MyBadgeLife Admin";
        break;

      case 'badge_approved':
        emailComponent = React.createElement(BadgeApprovedEmail, {
          badgeName: data.badgeName,
          makerName: data.makerName,
          teamName: data.teamName,
          category: data.category,
          imageUrl: data.imageUrl,
          badgeUrl: data.badgeUrl || `${supabaseUrl.replace('.supabase.co', '')}.lovable.app/?badge=${data.badgeId}`,
          exploreUrl: data.exploreUrl || `${supabaseUrl.replace('.supabase.co', '')}.lovable.app/`
        });
        subject = `🎉 Badge Approved: ${data.badgeName}`;
        break;

      case 'badge_rejected':
        emailComponent = React.createElement(BadgeRejectedEmail, {
          badgeName: data.badgeName,
          makerName: data.makerName,
          teamName: data.teamName,
          category: data.category,
          imageUrl: data.imageUrl,
          rejectionReason: data.rejectionReason,
          guidelinesUrl: data.guidelinesUrl || `${supabaseUrl.replace('.supabase.co', '')}.lovable.app/guidelines`,
          submitUrl: data.submitUrl || `${supabaseUrl.replace('.supabase.co', '')}.lovable.app/badge/register`
        });
        subject = `📝 Badge Submission Update: ${data.badgeName}`;
        break;

      case 'welcome_user':
        emailComponent = React.createElement(WelcomeUserEmail, {
          userName: data.userName,
          userEmail: data.userEmail,
          exploreUrl: data.exploreUrl || `${supabaseUrl.replace('.supabase.co', '')}.lovable.app/`,
          profileUrl: data.profileUrl || `${supabaseUrl.replace('.supabase.co', '')}.lovable.app/profile`,
          makerRequestUrl: data.makerRequestUrl || `${supabaseUrl.replace('.supabase.co', '')}.lovable.app/maker-request`,
          communityUrl: data.communityUrl
        });
        subject = `🎫 Welcome to MyBadgeLife!`;
        break;

      case 'maker_request':
        emailComponent = React.createElement(MakerRequestEmail, {
          userName: data.userName,
          userEmail: data.userEmail,
          requestMessage: data.requestMessage,
          userProfileUrl: data.userProfileUrl || `${supabaseUrl.replace('.supabase.co', '')}.lovable.app/profile/${data.userId}`,
          adminUrl: data.adminUrl || `${supabaseUrl.replace('.supabase.co', '')}.lovable.app/admin`,
          registrationDate: data.registrationDate
        });
        subject = `🛠️ New Maker Request: ${data.userName}`;
        fromName = "MyBadgeLife Admin";
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    // Render email template
    console.log('Rendering email template...');
    const html = await renderAsync(emailComponent);

    // Send email via Resend
    console.log('Sending email via Resend...');
    const emailResponse = await resend.emails.send({
      from: `${fromName} <noreply@mybadgelife.com>`,
      to: [to],
      subject,
      html,
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Log API call for analytics
    await logApiCall({
      api_provider: 'resend',
      endpoint: '/emails',
      method: 'POST',
      response_status: 200,
      response_time_ms: responseTime,
      estimated_cost_usd: 0.0001, // Estimated cost per email
      success: true,
      user_id: data.userId,
      session_id: data.sessionId
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResponse.data?.id,
        type,
        to
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Log failed API call
    await logApiCall({
      api_provider: 'resend',
      endpoint: '/emails',
      method: 'POST',
      response_status: 500,
      response_time_ms: responseTime,
      estimated_cost_usd: 0,
      success: false
    });

    console.error("Error in send-email function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);