import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // Validate admin password passed in request body
    const { admin_password } = await req.json();
    const expectedPassword = Deno.env.get("ADMIN_PASSWORD");

    if (!expectedPassword || admin_password !== expectedPassword) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: CORS }
      );
    }

    // Use service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch all data in parallel
    const [
      { data: subscriptions },
      { count: reportCount },
      { count: alertCount },
      { count: freeAlertCount },
      { count: pendingAlertCount },
      { count: failedAlertCount },
      { count: sentTodayCount },
    ] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("reports")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("alert_subscriptions")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("alert_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("plan_code", "free"),
      supabase
        .from("alert_subscriptions")
        .select("*", { count: "exact", head: true })
        .in("delivery_status", ["pending", "queued", "needs_booking_date"]),
      supabase
        .from("alert_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("delivery_status", "failed"),
      supabase
        .from("alert_subscriptions")
        .select("*", { count: "exact", head: true })
        .gte("last_sent_at", new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString()),
    ]);

    return new Response(
      JSON.stringify({
        ok: true,
        subscriptions: subscriptions || [],
        reportCount: reportCount || 0,
        alertCount: alertCount || 0,
        freeAlertCount: freeAlertCount || 0,
        pendingAlertCount: pendingAlertCount || 0,
        failedAlertCount: failedAlertCount || 0,
        sentTodayCount: sentTodayCount || 0,
      }),
      { headers: CORS }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: CORS }
    );
  }
});
