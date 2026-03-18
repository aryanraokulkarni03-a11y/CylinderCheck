import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Content-Type": "application/json",
};

type Article = {
  title: string;
  link: string;
  googleLink: string;
  pubDate: string;
  source: string;
  sourceUrl: string;
};

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function normalizeLink(link: string) {
  try {
    const url = new URL(link.trim());
    url.hash = "";
    return url.toString();
  } catch {
    return link.trim();
  }
}

function extractGoogleArticleId(link: string) {
  try {
    const url = new URL(link);
    if (url.hostname !== "news.google.com") return "";

    const parts = url.pathname.split("/").filter(Boolean);
    if (!parts.length) return "";

    const kindIndex = parts.findIndex((part) => part === "articles" || part === "read");
    if (kindIndex === -1 || !parts[kindIndex + 1]) return "";

    return parts[kindIndex + 1];
  } catch {
    return "";
  }
}

async function getDecodingParams(articleId: string) {
  const targets = [
    `https://news.google.com/articles/${articleId}`,
    `https://news.google.com/rss/articles/${articleId}`,
  ];

  for (const target of targets) {
    try {
      const response = await fetch(target, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; CylinderCheck/1.0)",
        },
      });

      if (!response.ok) continue;

      const html = await response.text();
      const signature = html.match(/data-n-a-sg="([^"]+)"/)?.[1] || "";
      const timestamp = html.match(/data-n-a-ts="([^"]+)"/)?.[1] || "";

      if (signature && timestamp) {
        return { signature, timestamp };
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function decodeGoogleNewsUrl(googleLink: string) {
  const articleId = extractGoogleArticleId(googleLink);
  if (!articleId) return "";

  const params = await getDecodingParams(articleId);
  if (!params) return "";

  const payload = [[[
    "Fbv4je",
    `["garturlreq",[["X","X",["X","X"],null,null,1,1,"IN:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${articleId}",${params.timestamp},"${params.signature}"]`,
    null,
    "generic",
  ]]];

  try {
    const response = await fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "Mozilla/5.0 (compatible; CylinderCheck/1.0)",
      },
      body: `f.req=${encodeURIComponent(JSON.stringify(payload))}`,
    });

    if (!response.ok) return "";

    const text = await response.text();
    const parts = text.split("\n\n");
    if (parts.length < 2) return "";

    const data = JSON.parse(parts[1]);
    const decoded = JSON.parse(data[0][2])?.[1] || "";
    return typeof decoded === "string" ? normalizeLink(decoded) : "";
  } catch {
    return "";
  }
}

async function pickResolvedLink(googleLink: string, sourceUrl: string) {
  if (!googleLink.includes("news.google.com/")) {
    return normalizeLink(googleLink);
  }

  const decodedLink = await decodeGoogleNewsUrl(googleLink);
  if (decodedLink) {
    return decodedLink;
  }

  if (sourceUrl) {
    return normalizeLink(sourceUrl);
  }

  return normalizeLink(googleLink);
}

async function parseRSS(xml: string) {
  const items: Article[] = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

  for (const match of itemMatches) {
    const item = match[1];

    const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
      || item.match(/<title>(.*?)<\/title>/)?.[1]
      || "";

    const googleLink = item.match(/<link>(.*?)<\/link>/)?.[1]
      || item.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1]
      || "";

    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";

    const source = item.match(/<source[^>]*>(.*?)<\/source>/)?.[1]
      || item.match(/<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>/)?.[1]
      || "News";

    const sourceUrl = item.match(/<source[^>]*url="(.*?)"[^>]*>/)?.[1] || "";

    const cleanTitle = title
      .replace(/\s*-\s*[^-]+$/, "")
      .replace(/\s*\|\s*[^|]+$/, "")
      .trim();

    const normalizedGoogleLink = decodeXmlEntities(googleLink);
    const normalizedSourceUrl = decodeXmlEntities(sourceUrl);
    const resolvedLink = await pickResolvedLink(normalizedGoogleLink, normalizedSourceUrl);

    if (cleanTitle && normalizedGoogleLink) {
      items.push({
        title: cleanTitle,
        link: resolvedLink,
        googleLink: normalizedGoogleLink,
        pubDate,
        source,
        sourceUrl: normalizedSourceUrl,
      });
    }
  }

  return items.slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const queries = [
      "LPG cylinder shortage India",
      "gas cylinder price India 2025",
      "LPG booking India",
    ];

    let articles: Article[] = [];

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
        const parsed = await parseRSS(xml);

        for (const item of parsed) {
          if (!articles.find((article) => article.title === item.title)) {
            articles.push(item);
          }
        }
      } catch {
        continue;
      }
    }

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
