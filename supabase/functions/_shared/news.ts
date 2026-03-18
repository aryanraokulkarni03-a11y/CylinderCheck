const QUERIES = [
  "LPG cylinder shortage India",
  "gas cylinder price India 2025",
  "LPG booking India",
];

export const NEWS_LIMIT = 8;
const DECODE_TIMEOUT_MS = 1800;

const RE_SHORTAGE = /shortage|delay|disruption|supply|scarcity|crisis|queue|queues|shut(?:ter|ting)?|sealed|switch to power|electric cooktop|electric cooktops|alternative/i;
const RE_PRICE = /price|rate|hike|revision|subsidy|cost|expensive/i;
const RE_POLICY = /ministry|government|policy|rule|regulation|announce|minister|customer data|oil cos seek/i;

const CITY_COORDS = {
  Delhi: true,
  Mumbai: true,
  Bangalore: true,
  Hyderabad: true,
  Chennai: true,
  Pune: true,
  Kolkata: true,
  Ahmedabad: true,
  Vizag: true,
  Jaipur: true,
  Lucknow: true,
  Patna: true,
  Ranchi: true,
};

const CITY_NORMALISE: Record<string, string> = {
  visakhapatnam: "Vizag",
  vizag: "Vizag",
  bengaluru: "Bangalore",
  bangalore: "Bangalore",
  "new delhi": "Delhi",
  delhi: "Delhi",
  calcutta: "Kolkata",
  kolkata: "Kolkata",
  madras: "Chennai",
  chennai: "Chennai",
  bombay: "Mumbai",
  mumbai: "Mumbai",
  ranchi: "Ranchi",
  karnataka: "Bangalore",
  bihar: "Patna",
  jharkhand: "Ranchi",
  "west bengal": "Kolkata",
  maharashtra: "Mumbai",
  telangana: "Hyderabad",
  "andhra pradesh": "Vizag",
  rajasthan: "Jaipur",
  "uttar pradesh": "Lucknow",
  gujarat: "Ahmedabad",
  "tamil nadu": "Chennai",
};

const CITY_KEYS = Object.keys(CITY_COORDS);

export type NewsArticle = {
  article_key: string;
  title: string;
  source: string;
  link: string;
  google_link: string;
  source_url: string;
  category: string;
  city: string | null;
  published_at: string;
  scraped_at: string;
};

type RawArticle = {
  title: string;
  googleLink: string;
  pubDate: string;
  source: string;
  sourceUrl: string;
};

function getCategory(title: string) {
  if (RE_SHORTAGE.test(title)) return "SHORTAGE SIGNALS";
  if (RE_PRICE.test(title)) return "PRICE & RATES";
  if (RE_POLICY.test(title)) return "POLICY";
  return "GENERAL";
}

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

function normalizeCityToken(token: string) {
  const cleaned = String(token || "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .trim();

  if (!cleaned) return null;

  for (const [needle, canonical] of Object.entries(CITY_NORMALISE)) {
    if (cleaned === needle || cleaned.includes(needle)) return canonical;
  }

  for (const city of CITY_KEYS) {
    if (cleaned === city.toLowerCase()) return city;
  }

  return null;
}

function getCityFromLink(link: string) {
  try {
    const url = new URL(String(link || "").trim());
    const parts = url.pathname
      .split("/")
      .filter(Boolean)
      .map((part) => decodeURIComponent(part));

    const cityIndex = parts.findIndex((part) => part.toLowerCase() === "city");
    if (cityIndex !== -1 && parts[cityIndex + 1]) {
      return normalizeCityToken(parts[cityIndex + 1]);
    }

    for (const part of parts) {
      const normalized = normalizeCityToken(part);
      if (normalized) return normalized;
    }
  } catch {
    return null;
  }

  return null;
}

function getCity(title: string, link: string) {
  const byLink = getCityFromLink(link);
  if (byLink) return byLink;

  const t = String(title || "").toLowerCase();
  const matches: Array<{ city: string; index: number }> = [];

  for (const [needle, canonical] of Object.entries(CITY_NORMALISE)) {
    const index = t.indexOf(needle);
    if (index >= 0) {
      matches.push({ city: canonical, index });
    }
  }

  for (const city of CITY_KEYS) {
    const index = t.indexOf(city.toLowerCase());
    if (index >= 0) {
      matches.push({ city, index });
    }
  }

  if (!matches.length) return null;
  matches.sort((a, b) => a.index - b.index);
  return matches[0].city;
}

function extractGoogleArticleId(link: string) {
  try {
    const url = new URL(link);
    if (url.hostname !== "news.google.com") return "";

    const parts = url.pathname.split("/").filter(Boolean);
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

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T) {
  let timeoutId: number | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

async function pickResolvedLink(googleLink: string, sourceUrl: string) {
  if (!googleLink.includes("news.google.com/")) {
    return normalizeLink(googleLink);
  }

  const decodedLink = await withTimeout(
    decodeGoogleNewsUrl(googleLink),
    DECODE_TIMEOUT_MS,
    "",
  );
  if (decodedLink) return decodedLink;
  if (sourceUrl) return normalizeLink(sourceUrl);
  return normalizeLink(googleLink);
}

function parseRSS(xml: string) {
  const items: RawArticle[] = [];
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

    if (cleanTitle && normalizedGoogleLink && pubDate) {
      items.push({
        title: cleanTitle,
        googleLink: normalizedGoogleLink,
        pubDate,
        source,
        sourceUrl: normalizedSourceUrl,
      });
    }
  }

  return items;
}

function buildArticleKey(article: {
  title: string;
  source: string;
  link: string;
  googleLink: string;
  publishedAt: string;
}) {
  const stableLink = article.link || article.googleLink;
  if (stableLink) return stableLink.toLowerCase();
  return [
    article.source.trim().toLowerCase(),
    article.title.trim().toLowerCase(),
    article.publishedAt,
  ].join("::");
}

export async function scrapeLatestNews() {
  const rawArticles: RawArticle[] = [];

  for (const query of QUERIES) {
    if (rawArticles.length >= NEWS_LIMIT * 2) break;

    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; CylinderCheck/1.0)",
        },
      });

      if (!res.ok) continue;

      const xml = await res.text();
      rawArticles.push(...parseRSS(xml));
    } catch {
      continue;
    }
  }

  const scrapedAt = new Date().toISOString();
  const normalized = await Promise.all(
    rawArticles.map(async (item) => {
      const link = await pickResolvedLink(item.googleLink, item.sourceUrl);
      const publishedAt = new Date(item.pubDate).toISOString();
      return {
        article_key: buildArticleKey({
          title: item.title,
          source: item.source,
          link,
          googleLink: item.googleLink,
          publishedAt,
        }),
        title: item.title,
        source: item.source,
        link,
        google_link: item.googleLink,
        source_url: item.sourceUrl,
        category: getCategory(item.title),
        city: getCity(item.title, link),
        published_at: publishedAt,
        scraped_at: scrapedAt,
      } satisfies NewsArticle;
    }),
  );

  const deduped = Array.from(
    normalized.reduce((map, article) => {
      const current = map.get(article.article_key);
      if (!current || new Date(article.published_at).getTime() > new Date(current.published_at).getTime()) {
        map.set(article.article_key, article);
      }
      return map;
    }, new Map<string, NewsArticle>()).values(),
  );

  deduped.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  return deduped.slice(0, NEWS_LIMIT);
}
