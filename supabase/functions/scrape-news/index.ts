import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadNewsScrapeConfig, scrapeLatestNews } from "../_shared/news.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Content-Type": "application/json",
};

function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
    const token = getBearerToken(req);

    if (!cronSecret || token !== cronSecret) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: CORS },
      );
    }

    const supabase = createServiceClient();
    const config = await loadNewsScrapeConfig(supabase);
    const articles = await scrapeLatestNews(config);

    if (articles.length) {
      const { error: upsertError } = await supabase
        .from("news_articles")
        .upsert(articles, { onConflict: "article_key" });

      if (upsertError) {
        throw upsertError;
      }
    }

    const retentionDays = Math.max(1, Math.round(config.retentionDays));
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const { error: pruneError } = await supabase
      .from("news_articles")
      .delete()
      .lt("published_at", cutoff);

    if (pruneError) {
      throw pruneError;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Scraped ${articles.length} normalized news articles`,
        scraped_count: articles.length,
        updated_at: new Date().toISOString(),
        schedule_ist: ["07:00", "19:00"],
        retention_days: retentionDays,
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
