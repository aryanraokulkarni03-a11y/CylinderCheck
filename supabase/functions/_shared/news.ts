import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildCityAliasLookup,
  readActiveNewsTopics,
  readEnabledCities,
  readPrimaryScrapeSource,
  readRuntimeConfig,
  resolveNewsRuntimeDefaults,
} from "./scrapeConfig.ts";

const RE_SHORTAGE = /shortage|delay|disruption|supply|scarcity|crisis|queue|queues|shut(?:ter|ting)?|sealed|switch to power|electric cooktop|electric cooktops|alternative/i;
const RE_PRICE = /price|rate|hike|revision|subsidy|cost|expensive/i;
const RE_POLICY = /ministry|government|policy|rule|regulation|announce|minister|customer data|oil cos seek/i;

const STATE_LOCATION_LABELS: Array<[string, string]> = [
  ["andaman and nicobar islands", "Andaman and Nicobar Islands"],
  ["andaman & nicobar islands", "Andaman and Nicobar Islands"],
  ["andhra pradesh", "Andhra Pradesh"],
  ["arunachal pradesh", "Arunachal Pradesh"],
  ["assam", "Assam"],
  ["bihar", "Bihar"],
  ["chandigarh", "Chandigarh"],
  ["chhattisgarh", "Chhattisgarh"],
  ["dadra and nagar haveli and daman and diu", "Dadra and Nagar Haveli and Daman and Diu"],
  ["dadra & nagar haveli and daman & diu", "Dadra and Nagar Haveli and Daman and Diu"],
  ["dadra and nagar haveli", "Dadra and Nagar Haveli and Daman and Diu"],
  ["daman and diu", "Dadra and Nagar Haveli and Daman and Diu"],
  ["delhi", "Delhi"],
  ["nct of delhi", "Delhi"],
  ["goa", "Goa"],
  ["gujarat", "Gujarat"],
  ["haryana", "Haryana"],
  ["himachal pradesh", "Himachal Pradesh"],
  ["jammu and kashmir", "Jammu and Kashmir"],
  ["jammu & kashmir", "Jammu and Kashmir"],
  [" j&k ", "Jammu and Kashmir"],
  ["jharkhand", "Jharkhand"],
  ["karnataka", "Karnataka"],
  ["kerala", "Kerala"],
  ["ladakh", "Ladakh"],
  ["lakshadweep", "Lakshadweep"],
  ["madhya pradesh", "Madhya Pradesh"],
  ["maharashtra", "Maharashtra"],
  ["manipur", "Manipur"],
  ["meghalaya", "Meghalaya"],
  ["mizoram", "Mizoram"],
  ["nagaland", "Nagaland"],
  ["odisha", "Odisha"],
  ["orissa", "Odisha"],
  ["puducherry", "Puducherry"],
  ["pondicherry", "Puducherry"],
  ["punjab", "Punjab"],
  ["rajasthan", "Rajasthan"],
  ["sikkim", "Sikkim"],
  ["tamil nadu", "Tamil Nadu"],
  ["telangana", "Telangana"],
  ["tripura", "Tripura"],
  ["uttar pradesh", "Uttar Pradesh"],
  ["uttarakhand", "Uttarakhand"],
  ["uttaranchal", "Uttarakhand"],
  ["west bengal", "West Bengal"],
];

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

type NewsScrapeConfig = {
  queries: string[];
  newsLimit: number;
  decodeTimeoutMs: number;
  requestTimeoutMs: number;
  retentionDays: number;
  rssSearchTemplate: string;
  cityLookup: Map<string, string>;
  cityNames: string[];
};

async function fetchWithTimeout(url: string, timeoutMs: number, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadNewsScrapeConfig(supabase: SupabaseClient): Promise<NewsScrapeConfig> {
  const source = await readPrimaryScrapeSource(supabase, "news");
  const [runtimeConfig, topics, cities] = await Promise.all([
    readRuntimeConfig(supabase, "news_scraper"),
    readActiveNewsTopics(supabase, source.source_key),
    readEnabledCities(supabase, "news_location_enabled"),
  ]);

  const defaults = resolveNewsRuntimeDefaults(runtimeConfig, source);
  const sourceConfig = (source.config ?? {}) as Record<string, unknown>;
  const rssSearchTemplate = String(sourceConfig.rss_search_template || "").trim();
  if (!rssSearchTemplate.includes("{query}")) {
    throw new Error("News scrape source is missing a valid rss_search_template.");
  }

  const queries = topics
    .map((topic) => String(topic.query_text || "").trim())
    .filter(Boolean);

  if (!queries.length) {
    throw new Error("No enabled news topics are configured.");
  }

  const cityLookup = buildCityAliasLookup(cities);
  const cityNames = cities.map((city) => city.city_name);

  return {
    queries,
    newsLimit: defaults.newsLimit,
    decodeTimeoutMs: defaults.decodeTimeoutMs,
    requestTimeoutMs: defaults.requestTimeoutMs,
    retentionDays: defaults.retentionDays,
    rssSearchTemplate,
    cityLookup,
    cityNames,
  };
}

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

function normalizeCityToken(token: string, cityLookup: Map<string, string>, cityNames: string[]) {
  const cleaned = String(token || "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .trim();

  if (!cleaned) return null;

  for (const [needle, canonical] of cityLookup.entries()) {
    if (cleaned === needle || cleaned.includes(needle)) return canonical;
  }

  for (const city of cityNames) {
    if (cleaned === city.toLowerCase()) return city;
  }

  return null;
}

function getCityFromLink(link: string, cityLookup: Map<string, string>, cityNames: string[]) {
  try {
    const url = new URL(String(link || "").trim());
    const parts = url.pathname
      .split("/")
      .filter(Boolean)
      .map((part) => decodeURIComponent(part));

    const cityIndex = parts.findIndex((part) => part.toLowerCase() === "city");
    if (cityIndex !== -1 && parts[cityIndex + 1]) {
      return normalizeCityToken(parts[cityIndex + 1], cityLookup, cityNames);
    }

    for (const part of parts) {
      const normalized = normalizeCityToken(part, cityLookup, cityNames);
      if (normalized) return normalized;
    }
  } catch {
    return null;
  }

  return null;
}

function getCity(title: string, link: string, cityLookup: Map<string, string>, cityNames: string[]) {
  const byLink = getCityFromLink(link, cityLookup, cityNames);
  if (byLink) return byLink;

  const t = String(title || "").toLowerCase();
  const matches: Array<{ city: string; index: number }> = [];

  for (const [needle, canonical] of cityLookup.entries()) {
    const index = t.indexOf(needle);
    if (index >= 0) {
      matches.push({ city: canonical, index });
    }
  }

  for (const city of cityNames) {
    const index = t.indexOf(city.toLowerCase());
    if (index >= 0) {
      matches.push({ city, index });
    }
  }

  if (!matches.length) return null;
  matches.sort((a, b) => a.index - b.index);
  return matches[0].city;
}

export function inferDisplayLocation(title: string, link: string, city: string | null) {
  const exactCity = String(city || "").trim();
  if (exactCity) return exactCity;

  const haystack = `${title || ""} ${link || ""}`.toLowerCase();
  for (const [needle, label] of STATE_LOCATION_LABELS) {
    if (haystack.includes(needle)) return label;
  }

  return "";
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

async function getDecodingParams(articleId: string, requestTimeoutMs: number) {
  const targets = [
    `https://news.google.com/articles/${articleId}`,
    `https://news.google.com/rss/articles/${articleId}`,
  ];

  for (const target of targets) {
    try {
      const response = await fetchWithTimeout(target, requestTimeoutMs, {
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

async function decodeGoogleNewsUrl(googleLink: string, requestTimeoutMs: number) {
  const articleId = extractGoogleArticleId(googleLink);
  if (!articleId) return "";

  const params = await getDecodingParams(articleId, requestTimeoutMs);
  if (!params) return "";

  const payload = [[[
    "Fbv4je",
    `["garturlreq",[["X","X",["X","X"],null,null,1,1,"IN:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${articleId}",${params.timestamp},"${params.signature}"]`,
    null,
    "generic",
  ]]];

  try {
    const response = await fetchWithTimeout("https://news.google.com/_/DotsSplashUi/data/batchexecute", requestTimeoutMs, {
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

async function pickResolvedLink(googleLink: string, sourceUrl: string, config: NewsScrapeConfig) {
  if (!googleLink.includes("news.google.com/")) {
    return normalizeLink(googleLink);
  }

  const decodedLink = await withTimeout(
    decodeGoogleNewsUrl(googleLink, config.requestTimeoutMs),
    config.decodeTimeoutMs,
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

export async function scrapeLatestNews(config: NewsScrapeConfig) {
  const rawArticles: RawArticle[] = [];

  for (const query of config.queries) {
    if (rawArticles.length >= config.newsLimit * 2) break;

    const url = config.rssSearchTemplate.replaceAll("{query}", encodeURIComponent(query));

    try {
      const res = await fetchWithTimeout(url, config.requestTimeoutMs, {
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
      const link = await pickResolvedLink(item.googleLink, item.sourceUrl, config);
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
        city: getCity(item.title, link, config.cityLookup, config.cityNames),
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
  return deduped.slice(0, config.newsLimit);
}
