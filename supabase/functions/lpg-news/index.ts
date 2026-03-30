import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { inferDisplayLocation, loadNewsScrapeConfig, scrapeLatestNews } from "../_shared/news.ts";

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
  scraped_at: string;
};

type PublishedArticleRow = {
  slug: string;
  headline: string;
  deck: string | null;
  body_markdown: string | null;
  hero_image_url: string | null;
  city: string | null;
  state: string | null;
  category: string;
  source_name: string;
  canonical_source_url: string;
  published_at: string;
  updated_at: string;
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
    displayLocation: inferDisplayLocation(article.title, article.link, article.city),
    pubDate: article.published_at,
    scrapedAt: article.scraped_at,
  };
}

function toPublishedResponseArticle(article: PublishedArticleRow) {
  return {
    title: article.headline,
    source: article.source_name,
    link: article.canonical_source_url,
    googleLink: "",
    sourceUrl: article.canonical_source_url,
    category: article.category,
    city: article.city,
    displayLocation: article.city || article.state || "",
    pubDate: article.published_at,
    scrapedAt: article.updated_at,
    slug: article.slug,
    deck: article.deck,
    bodyMarkdown: article.body_markdown,
    heroImageUrl: article.hero_image_url,
    publication: true,
  };
}

async function readStoredNews(limit: number) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("news_articles")
    .select("title, source, link, google_link, source_url, category, city, published_at, scraped_at")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as StoredArticleRow[];
}

async function readPublishedNews(limit: number) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("news_article_publications")
    .select("slug, headline, deck, body_markdown, hero_image_url, city, state, category, source_name, canonical_source_url, published_at, updated_at")
    .eq("publish_status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as PublishedArticleRow[];
}

async function seedNewsCache(limit: number) {
  const supabase = createServiceClient();
  const config = await loadNewsScrapeConfig(supabase);
  const scraped = await scrapeLatestNews(config);

  if (scraped.length) {
    const { error } = await supabase
      .from("news_articles")
      .upsert(scraped, { onConflict: "article_key" });

    if (error) {
      throw error;
    }
  }

  return scraped.slice(0, limit).map((article) => ({
    title: article.title,
    source: article.source,
    link: article.link,
    googleLink: article.google_link,
    sourceUrl: article.source_url,
    category: article.category,
    city: article.city,
    displayLocation: inferDisplayLocation(article.title, article.link, article.city),
    pubDate: article.published_at,
    scrapedAt: article.scraped_at,
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const config = await loadNewsScrapeConfig(createServiceClient());
    const limit = Math.max(1, Math.round(config.newsLimit));
    const viewMode = new URL(req.url).searchParams.get("view")?.toLowerCase() || "published";

    if (viewMode !== "feed") {
      const publications = await readPublishedNews(limit);
      const articles = publications.map(toPublishedResponseArticle);
      const updatedAt = articles[0]?.scrapedAt || null;

      return new Response(
        JSON.stringify({ ok: true, articles, updatedAt, view: "published" }),
        { headers: CORS },
      );
    }

    const stored = await readStoredNews(limit);
    const articles = stored.length
      ? stored.map(toResponseArticle)
      : await seedNewsCache(limit);
    const updatedAt = articles[0]?.scrapedAt || null;

    return new Response(
      JSON.stringify({ ok: true, articles, updatedAt, view: "feed" }),
      { headers: CORS },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, articles: [], error: String(err) }),
      { headers: CORS, status: 500 },
    );
  }
});
