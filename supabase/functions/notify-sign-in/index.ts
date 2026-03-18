import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const RESEND_API_URL = "https://api.resend.com/emails";
const NOTIFICATION_TYPE = "first_sign_in";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildEmailHtml(email: string) {
  const safeEmail = escapeHtml(email);

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CylinderCheck sign-in confirmed</title>
  </head>
  <body style="margin:0;padding:0;background:#f4efe6;color:#1f1712;font-family:General Sans,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fbf7ef;border:1px solid #e6d8c4;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 16px;border-bottom:1px solid #eadbc8;background:linear-gradient(180deg,#f9f1e3 0%,#fbf7ef 100%);">
                <div style="font-size:12px;line-height:1.4;letter-spacing:0.14em;text-transform:uppercase;color:#8c6f55;font-weight:600;">CylinderCheck by Xisch.Co</div>
                <h1 style="margin:14px 0 10px;font-family:Satoshi,Arial,sans-serif;font-size:34px;line-height:1.08;letter-spacing:-0.03em;color:#201610;font-weight:700;">
                  You're in. CylinderCheck is now set up for you.
                </h1>
                <p style="margin:0;font-size:16px;line-height:1.7;color:#5d4737;">
                  This email address was just used to sign in to CylinderCheck: <strong style="color:#201610;">${safeEmail}</strong>.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 28px 0;">
                <p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#5d4737;">
                  You're now ready to track booking windows, read local shortage signals, file community reports, and manage alerts without having to restart your setup every time.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;background:#fffaf3;border:1px solid #eadbc8;border-radius:18px;">
                  <tr>
                    <td style="padding:18px 18px 14px;">
                      <div style="font-size:12px;line-height:1.4;letter-spacing:0.14em;text-transform:uppercase;color:#8c6f55;font-weight:600;margin-bottom:10px;">A few smart habits when LPG supply feels unpredictable</div>
                      <ul style="margin:0;padding-left:18px;color:#3d2d22;font-size:15px;line-height:1.75;">
                        <li style="margin:0 0 8px;">Book inside your window as early as you comfortably can instead of waiting for the last day.</li>
                        <li style="margin:0 0 8px;">Soak dal, rajma, or chana ahead of time so stove time stays shorter on busy days.</li>
                        <li style="margin:0 0 8px;">Cook with lids on and match vessel size to the burner so more heat stays useful.</li>
                        <li style="margin:0 0 8px;">Switch the flame off a little early when residual heat can finish the dish.</li>
                        <li style="margin:0;">Keep burners clean and steady so the flame stays efficient instead of uneven.</li>
                      </ul>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="width:50%;padding:0 8px 0 0;vertical-align:top;">
                      <div style="border:1px solid #eadbc8;border-radius:18px;background:#fffaf3;padding:16px;height:100%;box-sizing:border-box;">
                        <div style="font-size:12px;line-height:1.4;letter-spacing:0.14em;text-transform:uppercase;color:#8c6f55;font-weight:600;margin-bottom:8px;">Use Track</div>
                        <div style="font-family:Satoshi,Arial,sans-serif;font-size:20px;line-height:1.2;color:#201610;font-weight:600;margin-bottom:8px;">Check your PIN before you guess</div>
                        <div style="font-size:14px;line-height:1.65;color:#5d4737;">Track combines booking timing, recent local reports, and delivery cues so you can act earlier without overreacting.</div>
                      </div>
                    </td>
                    <td style="width:50%;padding:0 0 0 8px;vertical-align:top;">
                      <div style="border:1px solid #eadbc8;border-radius:18px;background:#fffaf3;padding:16px;height:100%;box-sizing:border-box;">
                        <div style="font-size:12px;line-height:1.4;letter-spacing:0.14em;text-transform:uppercase;color:#8c6f55;font-weight:600;margin-bottom:8px;">Use Alerts</div>
                        <div style="font-family:Satoshi,Arial,sans-serif;font-size:20px;line-height:1.2;color:#201610;font-weight:600;margin-bottom:8px;">Let the system remember for you</div>
                        <div style="font-size:14px;line-height:1.65;color:#5d4737;">Once you add alerts, CylinderCheck can help you stay ahead of the next booking window instead of checking manually.</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 28px 28px;">
                <div style="border-top:1px solid #eadbc8;padding-top:18px;">
                  <p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#5d4737;">
                    If this sign-in was not you, reply to this email and we'll help you look into it.
                  </p>
                  <p style="margin:0;font-size:13px;line-height:1.7;color:#8c6f55;">
                    CylinderCheck by Xisch.Co<br />
                    Reply to: xisch.co@gmail.com
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();
}

function buildEmailText(email: string) {
  return [
    "You're in. CylinderCheck is now set up for you.",
    "",
    `This email address was just used to sign in to CylinderCheck: ${email}`,
    "",
    "You're now ready to track booking windows, read local shortage signals, file community reports, and manage alerts without having to restart your setup every time.",
    "",
    "A few smart habits when LPG supply feels unpredictable:",
    "- Book inside your window as early as you comfortably can instead of waiting for the last day.",
    "- Soak dal, rajma, or chana ahead of time so stove time stays shorter on busy days.",
    "- Cook with lids on and match vessel size to the burner so more heat stays useful.",
    "- Switch the flame off a little early when residual heat can finish the dish.",
    "- Keep burners clean and steady so the flame stays efficient instead of uneven.",
    "",
    "Use Track: check your PIN before you guess.",
    "Use Alerts: let the system remember for you.",
    "",
    "If this sign-in was not you, reply to this email and we'll help you look into it.",
    "",
    "CylinderCheck by Xisch.Co",
    "Reply to: xisch.co@gmail.com",
  ].join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    let token = authHeader.replace(/^Bearer\s+/i, "").trim();

    const requestBody = await req.json().catch(() => ({}));
    if (!token && typeof requestBody?.accessToken === "string") {
      token = requestBody.accessToken.trim();
    }

    if (!token) {
      return jsonResponse({ error: "Missing bearer token" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const resendFrom = Deno.env.get("RESEND_FROM_EMAIL") ?? "CylinderCheck <hello@cylindercheck.in>";
    const replyTo = Deno.env.get("SUPPORT_REPLY_TO") ?? "xisch.co@gmail.com";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Supabase service role not configured" }, 500);
    }

    if (!resendApiKey) {
      return jsonResponse({ error: "Resend API key not configured" }, 500);
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    if (userError || !user?.id || !user.email) {
      return jsonResponse({ error: "Authenticated user not found" }, 401);
    }

    const { data: existingLog, error: existingError } = await supabaseClient
      .from("auth_notification_log")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("notification_type", NOTIFICATION_TYPE)
      .maybeSingle();

    if (existingError) {
      console.error("Existing auth notification lookup failed:", existingError);
      return jsonResponse({ error: "Could not verify notification state" }, 500);
    }

    if (existingLog?.status === "sent") {
      return jsonResponse({ ok: true, sent: false, reason: "already-sent" });
    }

    const basePayload = {
      user_id: user.id,
      email: user.email,
      notification_type: NOTIFICATION_TYPE,
      provider: "resend",
      status: "pending",
      last_error: null,
      metadata: {
        source: "google-oauth",
        provider: user.app_metadata?.provider || "google",
      },
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabaseClient
      .from("auth_notification_log")
      .upsert(basePayload, { onConflict: "user_id,notification_type" });

    if (upsertError) {
      console.error("Auth notification upsert failed:", upsertError);
      return jsonResponse({ error: "Could not prepare notification record" }, 500);
    }

    const resendResponse = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [user.email],
        reply_to: replyTo,
        subject: "You're in. CylinderCheck is now set up for you.",
        html: buildEmailHtml(user.email),
        text: buildEmailText(user.email),
      }),
    });

    const resendJson = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      const errorMessage =
        (typeof resendJson?.message === "string" && resendJson.message) ||
        (typeof resendJson?.error?.message === "string" && resendJson.error.message) ||
        "Email send failed";

      await supabaseClient
        .from("auth_notification_log")
        .update({
          status: "failed",
          last_error: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("notification_type", NOTIFICATION_TYPE);

      return jsonResponse({ error: errorMessage }, 502);
    }

    await supabaseClient
      .from("auth_notification_log")
      .update({
        status: "sent",
        last_error: null,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          source: "google-oauth",
          provider: user.app_metadata?.provider || "google",
          resend_id: resendJson?.id || null,
        },
      })
      .eq("user_id", user.id)
      .eq("notification_type", NOTIFICATION_TYPE);

    return jsonResponse({ ok: true, sent: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return jsonResponse({ error: message }, 500);
  }
});
