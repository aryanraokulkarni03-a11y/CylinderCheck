import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  calculateNextSendAt,
  formatBookingReminderMessage,
  normalizeWhatsAppNumber,
} from "../_shared/alerts.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Content-Type": "application/json",
};

async function sendWhatsApp({
  accessToken,
  phoneNumberId,
  to,
  body,
}: {
  accessToken: string;
  phoneNumberId: string;
  to: string;
  body: string;
}) {
  const response = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          preview_url: false,
          body,
        },
      }),
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || "WhatsApp send failed");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "";
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
    if (!accessToken || !phoneNumberId) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "WhatsApp Cloud API credentials are missing",
        }),
        { status: 500, headers: CORS },
      );
    }

    const nowIso = new Date().toISOString();
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { data: subscriptions, error } = await supabase
      .from("alert_subscriptions")
      .select("id, contact, last_booking, next_send_at, last_sent_at, delivery_status")
      .eq("active", true)
      .eq("channel", "whatsapp")
      .eq("plan_code", "free")
      .eq("reminder_type", "booking_d_minus_2")
      .or(`next_send_at.is.null,next_send_at.lte.${nowIso}`);

    if (error) {
      throw error;
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const subscription of subscriptions ?? []) {
      const dueAt = subscription.next_send_at || calculateNextSendAt(subscription.last_booking);
      if (!dueAt || new Date(dueAt).getTime() > Date.now()) {
        skipped += 1;
        continue;
      }

      if (subscription.last_sent_at) {
        skipped += 1;
        continue;
      }

      const to = normalizeWhatsAppNumber(subscription.contact);
      if (!to) {
        failed += 1;
        await supabase
          .from("alert_subscriptions")
          .update({
            delivery_status: "failed",
            last_error: "Contact is not a valid WhatsApp number",
            next_send_at: dueAt,
          })
          .eq("id", subscription.id);
        continue;
      }

      try {
        await sendWhatsApp({
          accessToken,
          phoneNumberId,
          to,
          body: formatBookingReminderMessage(subscription.last_booking),
        });

        sent += 1;
        await supabase
          .from("alert_subscriptions")
          .update({
            delivery_status: "sent",
            last_sent_at: new Date().toISOString(),
            last_error: null,
            next_send_at: dueAt,
          })
          .eq("id", subscription.id);
      } catch (sendError) {
        failed += 1;
        await supabase
          .from("alert_subscriptions")
          .update({
            delivery_status: "failed",
            last_error: String(sendError),
            next_send_at: dueAt,
          })
          .eq("id", subscription.id);
      }
    }

    const { count: sentToday } = await supabase
      .from("alert_subscriptions")
      .select("*", { head: true, count: "exact" })
      .gte("last_sent_at", todayStart.toISOString());

    return new Response(
      JSON.stringify({
        ok: true,
        scanned: subscriptions?.length || 0,
        sent,
        failed,
        skipped,
        sentToday: sentToday || 0,
      }),
      { headers: CORS },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: CORS },
    );
  }
});
