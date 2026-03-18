import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { NEWS_LIMIT, scrapeLatestNews } from "../_shared/news.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Content-Type": "application/json",
};

type StoredArticleRow = {
  title: string;
  source: string;
  link: string;
  google_link: string;
  source_url: string | null;
  category: string;
  city: string | null;
  published_at: string;
};

function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

function toResponseArticle(article: StoredArticleRow) {
  return {
    title: article.title,
    source: article.source,
    link: article.link,
    googleLink: article.google_link,
    sourceUrl: article.source_url ?? "",
    category: article.category,
    city: article.city,
    pubDate: article.published_at,
  };
}

async function readStoredNews() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("news_articles")
    .select("title, source, link, google_link, source_url, category, city, published_at")
    .order("published_at", { ascending: false })
    .limit(NEWS_LIMIT);

  if (error) {
    throw error;
  }

  return (data ?? []) as StoredArticleRow[];
}

async function seedNewsCache() {
  const supabase = createServiceClient();
  const scraped = await scrapeLatestNews();

  if (scraped.length) {
    const { error } = await supabase
      .from("news_articles")
      .upsert(scraped, { onConflict: "article_key" });

    if (error) {
      throw error;
    }
  }

  return scraped.map((article) => ({
    title: article.title,
    source: article.source,
    link: article.link,
    googleLink: article.google_link,
    sourceUrl: article.source_url,
    category: article.category,
    city: article.city,
    pubDate: article.published_at,
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const stored = await readStoredNews();
    const articles = stored.length
      ? stored.map(toResponseArticle)
      : await seedNewsCache();

    return new Response(
      JSON.stringify({ ok: true, articles }),
      { headers: CORS },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, articles: [], error: String(err) }),
      { headers: CORS, status: 500 },
    );
  }
});
