import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Content-Type": "application/json",
};

// Parse RSS XML into clean articles
function parseRSS(xml: string) {
  const items: { title: string; link: string; pubDate: string; source: string }[] = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

  for (const match of itemMatches) {
    const item = match[1];

    const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
      || item.match(/<title>(.*?)<\/title>/)?.[1]
      || "";

    const link = item.match(/<link>(.*?)<\/link>/)?.[1]
      || item.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1]
      || "";

    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";

    const source = item.match(/<source[^>]*>(.*?)<\/source>/)?.[1]
      || item.match(/<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>/)?.[1]
      || "News";

    // Clean title — strip trailing " - Source Name"
    const cleanTitle = title
      .replace(/\s*-\s*[^-]+$/, "")
      .replace(/\s*\|\s*[^|]+$/, "")
      .trim();

    if (cleanTitle && link) {
      items.push({ title: cleanTitle, link, pubDate, source });
    }
  }

  return items.slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // Try multiple queries for broader coverage
    const queries = [
      "LPG cylinder shortage India",
      "gas cylinder price India 2025",
      "LPG booking India",
    ];

    let articles: ReturnType<typeof parseRSS> = [];

    for (const query of queries) {
      if (articles.length >= 8) break;

      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; CylinderCheck/1.0)",
          },
        });

        if (!res.ok) continue;

        const xml = await res.text();
        const parsed = parseRSS(xml);

        // Deduplicate by title
        for (const item of parsed) {
          if (!articles.find(a => a.title === item.title)) {
            articles.push(item);
          }
        }
      } catch {
        continue;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, articles }),
      { headers: CORS }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, articles: [], error: String(err) }),
      { headers: CORS, status: 500 }
    );
  }
});