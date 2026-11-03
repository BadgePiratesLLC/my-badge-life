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
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Admin-facing notifications always go to this fixed allowlist, never to a
// caller-supplied address.
const ADMIN_NOTIFICATION_EMAILS = (Deno.env.get("ADMIN_NOTIFICATION_EMAILS") ?? "admin@mybadgelife.app")
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean);

// Emails that notify admins about something a logged-in user did. Any
// authenticated user may trigger these; the recipient is always the fixed
// admin allowlist above, regardless of the `to` field in the request body.
const ADMIN_NOTIFICATION_TYPES = new Set(["badge_submitted", "maker_request", "team_request"]);

// Emails that only the signed-in user themselves may receive.
const SELF_NOTIFICATION_TYPES = new Set(["welcome_user"]);

// Emails that notify a *different* user (e.g. a badge maker) about an action
// taken on their behalf. Only a privileged caller (admin/moderator/approved
// maker) may trigger these, and the recipient is looked up server-side from
// the target user's profile — never taken from the request body.
const MANAGED_USER_NOTIFICATION_TYPES = new Set(["badge_approved", "badge_rejected"]);

const ALLOWED_EMAIL_TYPES = new Set([
  ...ADMIN_NOTIFICATION_TYPES,
  ...SELF_NOTIFICATION_TYPES,
  ...MANAGED_USER_NOTIFICATION_TYPES,
]);

const PER_USER_HOURLY_LIMIT = Number(Deno.env.get("EMAIL_PER_USER_HOURLY_LIMIT") ?? "10");
const GLOBAL_HOURLY_LIMIT = Number(Deno.env.get("EMAIL_GLOBAL_HOURLY_LIMIT") ?? "100");

interface EmailRequest {
  type: 'badge_submitted' | 'badge_approved' | 'badge_rejected' | 'welcome_user' | 'maker_request' | 'team_request';
  to?: string;
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

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

// Returns the caller's authenticated user (via a real user JWT), or null if
// the bearer token isn't a real user session (this rejects the anon key,
// which is a validly-signed JWT but has no attached user/session).
async function getAuthenticatedUser(jwt: string) {
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data, error } = await authClient.auth.getUser(jwt);
  if (error || !data?.user) return null;
  return data.user;
}

async function canManageBadges(userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, maker_approved')
    .eq('id', userId)
    .single();

  if (profile?.role === 'admin') return true;
  if (profile?.role === 'maker' && profile?.maker_approved) return true;

  const { data: roles } = await supabase.rpc('get_user_roles', { _user_id: userId });
  if (Array.isArray(roles) && (roles.includes('admin') || roles.includes('moderator'))) return true;

  return false;
}

async function lookupProfileEmail(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();

  if (error || !data?.email) return null;
  return data.email;
}

async function checkRateLimit(userId: string | null): Promise<string | null> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count: globalCount } = await supabase
    .from('api_call_logs')
    .select('id', { count: 'exact', head: true })
    .eq('api_provider', 'resend')
    .gte('created_at', oneHourAgo);

  if ((globalCount ?? 0) >= GLOBAL_HOURLY_LIMIT) {
    return 'global_rate_limit_exceeded';
  }

  if (userId) {
    const { count: userCount } = await supabase
      .from('api_call_logs')
      .select('id', { count: 'exact', head: true })
      .eq('api_provider', 'resend')
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo);

    if ((userCount ?? 0) >= PER_USER_HOURLY_LIMIT) {
      return 'per_user_rate_limit_exceeded';
    }
  }

  return null;
}

const handler = async (req: Request): Promise<Response> => {
  const startTime = Date.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Authentication: require a real authenticated user, or the
  // server-side service-role secret used by our own DB trigger. The public
  // anon key is a validly-signed JWT but is rejected by both checks below.
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!jwt) {
    return jsonResponse(401, { error: "Missing Authorization bearer token" });
  }

  const isServerSecret = jwt === supabaseServiceRoleKey;
  const callerUser = isServerSecret ? null : await getAuthenticatedUser(jwt);

  if (!isServerSecret && !callerUser) {
    console.warn("send-email: rejected call with no valid user session (anon key or invalid token)");
    return jsonResponse(401, { error: "Authentication required" });
  }

  let body: EmailRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const { type, data } = body;

  if (!type || !ALLOWED_EMAIL_TYPES.has(type)) {
    return jsonResponse(400, { error: `Unsupported email type: ${type}` });
  }

  // --- Recipient resolution: never trust a client-supplied `to`.
  // The only exception is our own server-side trigger (service-role
  // secret), which is not public-facing and supplies a trustworthy address
  // sourced straight from auth.users.
  let to: string[];

  if (isServerSecret) {
    if (!body.to) {
      return jsonResponse(400, { error: "Missing 'to' for server-authenticated call" });
    }
    to = [body.to];
  } else if (ADMIN_NOTIFICATION_TYPES.has(type)) {
    to = ADMIN_NOTIFICATION_EMAILS;
  } else if (SELF_NOTIFICATION_TYPES.has(type)) {
    if (!callerUser!.email) {
      return jsonResponse(400, { error: "Authenticated user has no email on file" });
    }
    to = [callerUser!.email];
  } else {
    // MANAGED_USER_NOTIFICATION_TYPES: only a privileged caller may notify
    // a different user, and the address is looked up server-side.
    const targetUserId = data?.userId;
    if (!targetUserId) {
      return jsonResponse(400, { error: "data.userId is required for this email type" });
    }

    const privileged = await canManageBadges(callerUser!.id);
    if (!privileged) {
      return jsonResponse(403, { error: "Not authorized to send this notification" });
    }

    const targetEmail = await lookupProfileEmail(targetUserId);
    if (!targetEmail) {
      return jsonResponse(404, { error: "Target user profile/email not found" });
    }
    to = [targetEmail];
  }

  // --- Rate limiting (per-user, skipped for the trusted server secret, plus
  // a global cap that always applies) to protect the Resend account/domain
  // reputation from abuse by any authorized-but-noisy caller.
  const rateLimitReason = await checkRateLimit(isServerSecret ? null : callerUser!.id);
  if (rateLimitReason) {
    console.warn(`send-email: rate limited (${rateLimitReason})`);
    return jsonResponse(429, { error: "Rate limit exceeded", reason: rateLimitReason });
  }

  try {
    console.log(`Processing email request: ${type} to ${to.join(', ')}`);

    // Check email preferences for user-specific emails (except welcome emails which are always sent)
    if (data?.userId && !['welcome_user', 'password_reset', 'security_alert'].includes(type)) {
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
      to,
      subject,
      html,
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Log API call for analytics (and for rate limiting on subsequent calls)
    await logApiCall({
      api_provider: 'resend',
      endpoint: '/emails',
      method: 'POST',
      response_status: 200,
      response_time_ms: responseTime,
      estimated_cost_usd: 0.0001, // Estimated cost per email
      success: true,
      user_id: isServerSecret ? data?.userId : callerUser!.id,
      session_id: data?.sessionId
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
