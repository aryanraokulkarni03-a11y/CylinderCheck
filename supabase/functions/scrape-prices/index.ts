import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  readEnabledCities,
  readEnabledScrapeSources,
  readRuntimeConfig,
  resolvePriceRuntimeDefaults,
} from "../_shared/scrapeConfig.ts";
import {
  createScrapeJob,
  finishScrapeJob,
  pruneExpiredRawSourceDocuments,
  recordScrapeJobAttempt,
  storeRawSourceDocument,
} from "../_shared/scrapeJobs.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Content-Type": "application/json",
};

const SCRAPER_NAME = "scrape-prices";

const PRODUCT_TYPES = ["domestic_14_2kg", "commercial_19kg"] as const;
const MIN_PRICE = 700;
const MAX_PRICE_BY_TYPE = {
  domestic_14_2kg: 1400,
  commercial_19kg: 4000,
} as const;
const MAX_PERCENT_DELTA = 0.12;
const MAX_ABSOLUTE_DELTA_BY_TYPE = {
  domestic_14_2kg: 120,
  commercial_19kg: 500,
} as const;

const BLOCK_HINTS = [
  "captcha",
  "access denied",
  "forbidden",
  "temporarily unavailable",
  "blocked",
  "unusual traffic",
  "robot",
  "ddos",
];

type ProductType = typeof PRODUCT_TYPES[number];
type ScrapeMode = "production" | "sandbox";
type RequestStatus =
  | "success"
  | "timeout"
  | "rate_limited"
  | "blocked"
  | "http_error"
  | "network_error";

type ProductCandidate = {
  price: number | null;
  parseMethod: string | null;
  parseReason: string;
};

type ValidationResult = {
  accepted: boolean;
  status: "accepted" | "rejected" | "missing";
  reason: string;
};

type PriceLogRow = {
  city: string;
  state: string;
  product_type: ProductType;
  source_url: string;
  candidate_price: number | null;
  published_price: number | null;
  parse_method: string | null;
  validation_status: string;
  validation_reason: string;
  scraped_at: string;
};

type RequestLogRow = {
  run_id: number | null;
  scraper_name: string;
  scrape_mode: ScrapeMode;
  source_host: string;
  target_key: string;
  target_url: string;
  request_url: string;
  proxy_label: string | null;
  attempt: number;
  status_code: number | null;
  request_status: RequestStatus;
  latency_ms: number | null;
  error_message: string | null;
  rate_limited: boolean;
  blocked_suspected: boolean;
};

type RequestFetchResult = {
  html: string | null;
  requestLogs: RequestLogRow[];
  requestStatus: RequestStatus;
  finalStatusCode: number | null;
  capturedHtml: string | null;
};

type CityScrapeResult = {
  city: string;
  state: string;
  sourceKey: string;
  sourceHost: string;
  sourcePublishEnabled: boolean;
  sourceUrl: string;
  prices: Record<ProductType, ProductCandidate>;
  requestLogs: RequestLogRow[];
  requestStatus: RequestStatus;
  sourceStatusCode: number | null;
  rawHtml: string | null;
  rawHtmlKind: "success" | "blocked" | null;
  attemptedSourceKeys: string[];
  usedFallback: boolean;
  blockedDebugHtml: string | null;
  blockedDebugSourceKey: string | null;
  blockedDebugSourceHost: string | null;
  blockedDebugSourceUrl: string | null;
};

type PriceCityConfig = {
  city: string;
  state: string;
  canonicalSlug: string;
  sourceSlug: string;
  aliases: string[];
};

type PriceSourceConfig = {
  sourceKey: string;
  sourceHost: string;
  sourceBaseUrl: string;
  cityPathTemplate: string;
  fetchTimeoutMs: number;
  requestJitterMs: number;
  retryLimit: number;
  retryBaseDelayMs: number;
  publishEnabled: boolean;
  priority: number;
};

type RunConfig = {
  envRole: ScrapeMode;
  mode: ScrapeMode;
  publish: boolean;
  maxConcurrency: number;
  rawDocumentRetentionDays: number;
  sourceFailoverEnabled: boolean;
  captureBlockedHtml: boolean;
  primarySourceKey: string;
  primarySourceHost: string;
  priceSources: PriceSourceConfig[];
  proxyLabel: string | null;
  proxyUrlTemplate: string | null;
  proxyAuthHeaderName: string | null;
  proxyAuthHeaderValue: string | null;
  selectedCities: PriceCityConfig[];
};

const PRODUCT_PATTERNS: Array<{ key: ProductType; patterns: RegExp[] }> = [
  {
    key: "domestic_14_2kg",
    patterns: [
      /domestic\s*\(14\.2\s*kg\)\s*(?:â‚¹|Ã¢â€šÂ¹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i,
      /domestic\s*\(14\.2\s*kg\)[\s\S]{0,80}?(?:â‚¹|Ã¢â€šÂ¹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i,
    ],
  },
  {
    key: "commercial_19kg",
    patterns: [
      /commercial\s*\(19\s*kg\)\s*(?:â‚¹|Ã¢â€šÂ¹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i,
      /commercial\s*\(19\s*kg\)[\s\S]{0,80}?(?:â‚¹|Ã¢â€šÂ¹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i,
    ],
  },
];

function parseInteger(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function parseBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomJitter(maxMs: number) {
  if (maxMs <= 0) return 0;
  return Math.floor(Math.random() * (maxMs + 1));
}

function emptyCandidates(): Record<ProductType, ProductCandidate> {
  return {
    domestic_14_2kg: {
      price: null,
      parseMethod: null,
      parseReason: "No product-specific match found",
    },
    commercial_19kg: {
      price: null,
      parseMethod: null,
      parseReason: "No product-specific match found",
    },
  };
}

function normalizeSourceText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#8377;|&#x20b9;|&rupee;/gi, "â‚¹")
    .replace(/Ã¢â€šÂ¹/g, "â‚¹")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePrice(raw: string | undefined, productType: ProductType) {
  if (!raw) return null;
  const value = Number.parseFloat(raw.replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  if (value < MIN_PRICE || value > MAX_PRICE_BY_TYPE[productType]) return null;
  return value;
}

function validateCandidate(
  candidate: ProductCandidate,
  previousPrice: number | null,
  productType: ProductType,
): ValidationResult {
  if (candidate.price == null) {
    return {
      accepted: false,
      status: "missing",
      reason: candidate.parseReason,
    };
  }

  if (previousPrice == null || !Number.isFinite(previousPrice)) {
    return {
      accepted: true,
      status: "accepted",
      reason: "Accepted from company-specific match",
    };
  }

  const absoluteDelta = Math.abs(candidate.price - previousPrice);
  const percentDelta = previousPrice > 0 ? absoluteDelta / previousPrice : 0;

  if (absoluteDelta > MAX_ABSOLUTE_DELTA_BY_TYPE[productType] || percentDelta > MAX_PERCENT_DELTA) {
    return {
      accepted: false,
      status: "rejected",
      reason: `Rejected: suspicious delta vs last trusted price (${previousPrice})`,
    };
  }

  return {
    accepted: true,
    status: "accepted",
    reason: "Accepted against previous trusted price",
  };
}

function isBlockSuspected(statusCode: number | null, html: string | null) {
  if (statusCode != null && [403, 429, 503].includes(statusCode)) return true;
  const lower = String(html ?? "").toLowerCase();
  return BLOCK_HINTS.some((hint) => lower.includes(hint));
}

function classifyRequestStatus(statusCode: number | null, html: string | null): RequestStatus {
  if (statusCode == null) return "network_error";
  if (statusCode === 429) return "rate_limited";
  if (isBlockSuspected(statusCode, html)) return "blocked";
  if (statusCode >= 200 && statusCode < 300) return "success";
  return "http_error";
}

function mapRequestStatusToAttemptStatus(status: RequestStatus) {
  switch (status) {
    case "success":
      return "succeeded" as const;
    case "timeout":
      return "timeout" as const;
    case "rate_limited":
      return "rate_limited" as const;
    case "blocked":
      return "blocked" as const;
    default:
      return "failed" as const;
  }
}

function buildPriceSourceUrl(slug: string, source: PriceSourceConfig) {
  const cityPath = source.cityPathTemplate.includes("{slug}")
    ? source.cityPathTemplate.replaceAll("{slug}", slug)
    : source.cityPathTemplate;
  return new URL(cityPath, source.sourceBaseUrl).toString();
}

function shouldRetry(status: RequestStatus, attempt: number, retryLimit: number) {
  if (attempt >= retryLimit) return false;
  return status === "timeout" || status === "rate_limited" || status === "blocked" || status === "network_error";
}

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

function buildOutboundUrl(targetUrl: string, config: RunConfig) {
  if (!config.proxyUrlTemplate) {
    return { requestUrl: targetUrl, viaProxy: false };
  }

  const requestUrl = config.proxyUrlTemplate.includes("{{url}}")
    ? config.proxyUrlTemplate.replaceAll("{{url}}", encodeURIComponent(targetUrl))
    : config.proxyUrlTemplate;

  return { requestUrl, viaProxy: true };
}

function sanitizeLoggedRequestUrl(requestUrl: string, viaProxy: boolean) {
  try {
    const url = new URL(requestUrl);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    if (viaProxy) {
      return `${url.origin}${url.pathname}`;
    }
    return url.toString();
  } catch {
    if (viaProxy) return "proxy://configured";
    return requestUrl.split("?")[0];
  }
}

async function fetchCityHtml(
  sourceUrl: string,
  city: string,
  runId: number | null,
  config: RunConfig,
  source: PriceSourceConfig,
): Promise<RequestFetchResult> {
  const requestLogs: RequestLogRow[] = [];
  let capturedHtml: string | null = null;

  for (let attempt = 0; attempt <= source.retryLimit; attempt += 1) {
    const { requestUrl, viaProxy } = buildOutboundUrl(sourceUrl, config);
    const loggedRequestUrl = sanitizeLoggedRequestUrl(requestUrl, viaProxy);
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (compatible; CylinderCheck/1.0; +https://cylindercheck.in)",
      "Accept": "text/html,application/xhtml+xml",
    };

    if (config.proxyAuthHeaderName && config.proxyAuthHeaderValue) {
      headers[config.proxyAuthHeaderName] = config.proxyAuthHeaderValue;
    }

    const jitterMs = randomJitter(source.requestJitterMs);
    if (jitterMs > 0) {
      await sleep(jitterMs);
    }

    const startedAt = Date.now();

    try {
      const res = await fetchWithTimeout(requestUrl, source.fetchTimeoutMs, { headers });
      const latencyMs = Date.now() - startedAt;
      const html = await res.text();
      const requestStatus = classifyRequestStatus(res.status, html);
      const blocked = isBlockSuspected(res.status, html);
      if (blocked && config.captureBlockedHtml && !capturedHtml) {
        capturedHtml = html;
      }

      requestLogs.push({
        run_id: runId,
        scraper_name: SCRAPER_NAME,
        scrape_mode: config.mode,
        source_host: source.sourceHost,
        target_key: city,
        target_url: sourceUrl,
        request_url: loggedRequestUrl,
        proxy_label: config.proxyLabel,
        attempt: attempt + 1,
        status_code: res.status,
        request_status: requestStatus,
        latency_ms: latencyMs,
        error_message: null,
        rate_limited: res.status === 429,
        blocked_suspected: blocked,
      });

      if (requestStatus === "success") {
        return {
          html,
          requestLogs,
          requestStatus,
          finalStatusCode: res.status,
          capturedHtml: html,
        };
      }

      if (!shouldRetry(requestStatus, attempt, source.retryLimit)) {
        return {
          html: null,
          requestLogs,
          requestStatus,
          finalStatusCode: res.status,
          capturedHtml,
        };
      }
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const aborted = error instanceof Error && error.name === "AbortError";
      const requestStatus: RequestStatus = aborted ? "timeout" : "network_error";

      requestLogs.push({
        run_id: runId,
        scraper_name: SCRAPER_NAME,
        scrape_mode: config.mode,
        source_host: source.sourceHost,
        target_key: city,
        target_url: sourceUrl,
        request_url: loggedRequestUrl,
        proxy_label: config.proxyLabel,
        attempt: attempt + 1,
        status_code: null,
        request_status: requestStatus,
        latency_ms: latencyMs,
        error_message: error instanceof Error ? error.message : String(error),
        rate_limited: false,
        blocked_suspected: false,
      });

      if (!shouldRetry(requestStatus, attempt, source.retryLimit)) {
        return {
          html: null,
          requestLogs,
          requestStatus,
          finalStatusCode: null,
          capturedHtml,
        };
      }
    }

    const backoffMs = source.retryBaseDelayMs * (attempt + 1);
    await sleep(backoffMs);
  }

  return {
    html: null,
    requestLogs,
    requestStatus: "network_error",
    finalStatusCode: null,
    capturedHtml,
  };
}

async function scrapeCityPrices(
  city: string,
  slug: string,
  runId: number | null,
  config: RunConfig,
  source: PriceSourceConfig,
): Promise<CityScrapeResult> {
  const sourceUrl = buildPriceSourceUrl(slug, source);
  const prices = emptyCandidates();
  const state = config.selectedCities.find((entry) => entry.city === city)?.state || "";
  const fetchResult = await fetchCityHtml(sourceUrl, city, runId, config, source);

  if (!fetchResult.html) {
    const reason = fetchResult.requestStatus === "timeout"
      ? "Timed out while reading source page"
      : fetchResult.requestStatus === "rate_limited"
        ? "Source rate-limited this request"
        : fetchResult.requestStatus === "blocked"
          ? "Source appeared to block this request"
          : fetchResult.finalStatusCode
            ? `Source returned ${fetchResult.finalStatusCode}`
            : "Failed to read source page";

    for (const productType of PRODUCT_TYPES) {
      prices[productType] = {
        price: null,
        parseMethod: null,
        parseReason: reason,
      };
    }

    return {
      city,
      state,
      sourceKey: source.sourceKey,
      sourceHost: source.sourceHost,
      sourcePublishEnabled: source.publishEnabled,
      sourceUrl,
      prices,
      requestLogs: fetchResult.requestLogs,
      requestStatus: fetchResult.requestStatus,
      sourceStatusCode: fetchResult.finalStatusCode,
      rawHtml: fetchResult.capturedHtml,
      rawHtmlKind: fetchResult.capturedHtml ? "blocked" : null,
      attemptedSourceKeys: [source.sourceKey],
      usedFallback: false,
      blockedDebugHtml: fetchResult.capturedHtml,
      blockedDebugSourceKey: fetchResult.capturedHtml ? source.sourceKey : null,
      blockedDebugSourceHost: fetchResult.capturedHtml ? source.sourceHost : null,
      blockedDebugSourceUrl: fetchResult.capturedHtml ? sourceUrl : null,
    };
  }

  const html = normalizeSourceText(fetchResult.html);

  for (const { key, patterns } of PRODUCT_PATTERNS) {
    for (let index = 0; index < patterns.length; index += 1) {
      const pattern = patterns[index];
      const match = html.match(pattern);
      if (!match) continue;

      const price = parsePrice(match[1], key);
      if (price == null) {
        prices[key] = {
          price: null,
          parseMethod: `regex:${index + 1}`,
          parseReason: "Matched text but extracted price was outside trusted range",
        };
        continue;
      }

      prices[key] = {
        price,
        parseMethod: `regex:${index + 1}`,
        parseReason: "Matched product-specific price",
      };
      break;
    }
  }

  return {
    city,
    state,
    sourceKey: source.sourceKey,
    sourceHost: source.sourceHost,
    sourcePublishEnabled: source.publishEnabled,
    sourceUrl,
    prices,
    requestLogs: fetchResult.requestLogs,
    requestStatus: fetchResult.requestStatus,
    sourceStatusCode: fetchResult.finalStatusCode,
    rawHtml: fetchResult.html,
    rawHtmlKind: "success",
    attemptedSourceKeys: [source.sourceKey],
    usedFallback: false,
    blockedDebugHtml: null,
    blockedDebugSourceKey: null,
    blockedDebugSourceHost: null,
    blockedDebugSourceUrl: null,
  };
}

function pickPreferredFailure(current: CityScrapeResult | null, next: CityScrapeResult) {
  if (!current) return next;

  const rank = (status: RequestStatus) => {
    switch (status) {
      case "blocked":
        return 5;
      case "rate_limited":
        return 4;
      case "timeout":
        return 3;
      case "network_error":
        return 2;
      case "http_error":
        return 1;
      default:
        return 0;
    }
  };

  return rank(next.requestStatus) >= rank(current.requestStatus) ? next : current;
}

async function scrapeCityWithFallback(
  cityConfig: PriceCityConfig,
  runId: number | null,
  config: RunConfig,
) {
  const combinedLogs: RequestLogRow[] = [];
  const attemptedSourceKeys: string[] = [];
  let preferredFailure: CityScrapeResult | null = null;
  let capturedBlockedHtml: string | null = null;
  let capturedBlockedSourceKey: string | null = null;
  let capturedBlockedSourceHost: string | null = null;
  let capturedBlockedSourceUrl: string | null = null;

  for (let index = 0; index < config.priceSources.length; index += 1) {
    const source = config.priceSources[index];
    const result = await scrapeCityPrices(cityConfig.city, cityConfig.sourceSlug, runId, config, source);

    attemptedSourceKeys.push(source.sourceKey);
    combinedLogs.push(...result.requestLogs);

    if (!capturedBlockedHtml && result.rawHtmlKind === "blocked" && result.rawHtml) {
      capturedBlockedHtml = result.rawHtml;
      capturedBlockedSourceKey = result.sourceKey;
      capturedBlockedSourceHost = result.sourceHost;
      capturedBlockedSourceUrl = result.sourceUrl;
    }

    if (result.requestStatus === "success") {
      return {
        ...result,
        requestLogs: combinedLogs,
        attemptedSourceKeys: [...attemptedSourceKeys],
        usedFallback: index > 0,
        blockedDebugHtml: capturedBlockedHtml,
        blockedDebugSourceKey: capturedBlockedSourceKey,
        blockedDebugSourceHost: capturedBlockedSourceHost,
        blockedDebugSourceUrl: capturedBlockedSourceUrl,
      };
    }

    preferredFailure = pickPreferredFailure(preferredFailure, result);

    if (!config.sourceFailoverEnabled) {
      break;
    }
  }

  const fallbackResult = preferredFailure ?? {
    city: cityConfig.city,
    state: cityConfig.state,
    sourceKey: config.primarySourceKey,
    sourceHost: config.primarySourceHost,
    sourcePublishEnabled: config.priceSources[0]?.publishEnabled ?? false,
    sourceUrl: buildPriceSourceUrl(cityConfig.sourceSlug, config.priceSources[0]),
    prices: emptyCandidates(),
    requestLogs: [],
    requestStatus: "network_error" as const,
    sourceStatusCode: null,
    rawHtml: null,
    rawHtmlKind: null,
    attemptedSourceKeys: [],
    usedFallback: false,
    blockedDebugHtml: null,
    blockedDebugSourceKey: null,
    blockedDebugSourceHost: null,
    blockedDebugSourceUrl: null,
  };

  return {
    ...fallbackResult,
    requestLogs: combinedLogs,
    rawHtml: capturedBlockedHtml ?? fallbackResult.rawHtml,
    rawHtmlKind: capturedBlockedHtml ? "blocked" : fallbackResult.rawHtmlKind,
    attemptedSourceKeys: [...attemptedSourceKeys],
    usedFallback: attemptedSourceKeys.length > 1,
    blockedDebugHtml: capturedBlockedHtml ?? fallbackResult.blockedDebugHtml,
    blockedDebugSourceKey: capturedBlockedSourceKey ?? fallbackResult.blockedDebugSourceKey,
    blockedDebugSourceHost: capturedBlockedSourceHost ?? fallbackResult.blockedDebugSourceHost,
    blockedDebugSourceUrl: capturedBlockedSourceUrl ?? fallbackResult.blockedDebugSourceUrl,
  };
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
) {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function consume() {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= items.length) return;
      results[current] = await worker(items[current]);
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length || 1)) },
    () => consume(),
  );

  await Promise.all(workers);
  return results;
}

async function readJsonBody(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function selectCities(cityInputs: unknown, availableCities: PriceCityConfig[]) {
  if (!Array.isArray(cityInputs) || !cityInputs.length) return [...availableCities];

  const aliasLookup = new Map<string, PriceCityConfig>();
  for (const city of availableCities) {
    const values = [
      city.city,
      city.canonicalSlug,
      city.sourceSlug,
      ...city.aliases,
    ]
      .map((entry) => String(entry || "").trim().toLowerCase())
      .filter(Boolean);

    for (const value of values) {
      aliasLookup.set(value, city);
    }
  }

  const requested = new Set(
    cityInputs
      .map((entry) => String(entry || "").trim().toLowerCase())
      .filter(Boolean),
  );

  const selected = Array.from(
    requested.values()
      .map((value) => aliasLookup.get(value))
      .filter((value): value is PriceCityConfig => Boolean(value)),
  );

  return selected.length ? selected : [...availableCities];
}

async function buildRunConfig(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
): Promise<RunConfig> {
  const [cities, sources, runtimeConfig] = await Promise.all([
    readEnabledCities(supabase, "price_scrape_enabled"),
    readEnabledScrapeSources(supabase, "price"),
    readRuntimeConfig(supabase, "price_scraper"),
  ]);

  const availableCities = cities
    .filter((city) => city.price_source_slug)
    .map((city) => ({
      city: city.city_name,
      state: city.state_name,
      canonicalSlug: city.canonical_slug,
      sourceSlug: city.price_source_slug || city.canonical_slug,
      aliases: city.aliases ?? [],
    }));

  if (!availableCities.length) {
    throw new Error("No enabled city_registry rows are available for price scraping.");
  }

  const primarySource = sources[0];
  const defaults = resolvePriceRuntimeDefaults(runtimeConfig, primarySource);
  const priceSources = sources.map((source) => {
    const sourceConfig = (source.config ?? {}) as Record<string, unknown>;
    const cityPathTemplate = String(sourceConfig.city_path_template || "").trim();
    if (!cityPathTemplate.includes("{slug}")) {
      throw new Error(`Price source ${source.source_key} is missing a valid city_path_template.`);
    }

    return {
      sourceKey: source.source_key,
      sourceHost: source.host || new URL(source.base_url).host,
      sourceBaseUrl: source.base_url,
      cityPathTemplate,
      fetchTimeoutMs: source.timeout_ms,
      requestJitterMs: source.request_jitter_ms,
      retryLimit: source.retry_limit,
      retryBaseDelayMs: source.retry_base_delay_ms,
      publishEnabled: source.publish_enabled,
      priority: source.priority,
    } satisfies PriceSourceConfig;
  });

  const envRole = String(Deno.env.get("SCRAPE_ENV") ?? "production").trim().toLowerCase() === "sandbox"
    ? "sandbox"
    : "production";
  const requestedMode = String(body.mode ?? envRole).trim().toLowerCase();
  const mode = requestedMode === "sandbox" ? "sandbox" : "production";
  const defaultPublish = mode === "production";
  const allowPublishOverride = parseBoolean(Deno.env.get("SCRAPE_ALLOW_PUBLISH_OVERRIDE"), false);
  const requestedPublish = parseBoolean(body.publish, defaultPublish);
  const publish = allowPublishOverride ? requestedPublish : defaultPublish;

  return {
    envRole,
    mode,
    publish,
    maxConcurrency: parseInteger(
      body.maxConcurrency != null ? String(body.maxConcurrency) : String(defaults.maxConcurrency),
      defaults.maxConcurrency,
      1,
      12,
    ),
    rawDocumentRetentionDays: Math.max(1, Math.round(defaults.rawDocumentRetentionDays)),
    sourceFailoverEnabled: parseBoolean(body.sourceFailoverEnabled, defaults.sourceFailoverEnabled),
    captureBlockedHtml: parseBoolean(body.captureBlockedHtml, defaults.captureBlockedHtml),
    primarySourceKey: primarySource.source_key,
    primarySourceHost: primarySource.host || new URL(primarySource.base_url).host,
    priceSources: priceSources.map((source) => ({
      ...source,
      fetchTimeoutMs: parseInteger(
        body.fetchTimeoutMs != null ? String(body.fetchTimeoutMs) : String(source.fetchTimeoutMs),
        source.fetchTimeoutMs,
        250,
        60000,
      ),
      requestJitterMs: parseInteger(
        body.requestJitterMs != null ? String(body.requestJitterMs) : String(source.requestJitterMs),
        source.requestJitterMs,
        0,
        8000,
      ),
      retryLimit: parseInteger(
        body.retryLimit != null ? String(body.retryLimit) : String(source.retryLimit),
        source.retryLimit,
        0,
        5,
      ),
      retryBaseDelayMs: parseInteger(
        body.retryBaseDelayMs != null ? String(body.retryBaseDelayMs) : String(source.retryBaseDelayMs),
        source.retryBaseDelayMs,
        250,
        15000,
      ),
    })),
    proxyLabel: Deno.env.get("SCRAPE_PROXY_LABEL")?.trim() || null,
    proxyUrlTemplate: Deno.env.get("SCRAPE_PROXY_URL_TEMPLATE")?.trim() || null,
    proxyAuthHeaderName: Deno.env.get("SCRAPE_PROXY_AUTH_HEADER_NAME")?.trim() || null,
    proxyAuthHeaderValue: Deno.env.get("SCRAPE_PROXY_AUTH_HEADER_VALUE")?.trim() || null,
    selectedCities: selectCities(body.cities, availableCities),
  };
}

function validateRunConfig(config: RunConfig) {
  if (config.mode !== config.envRole) {
    return `Requested ${config.mode} mode, but this function is configured as ${config.envRole}.`;
  }

  if (config.envRole === "sandbox" && config.publish) {
    return "Sandbox environment cannot publish live price updates.";
  }

  if (!config.priceSources.length) {
    return "No enabled price scrape sources are configured.";
  }

  return null;
}

async function createScrapeRun(
  supabase: ReturnType<typeof createClient>,
  config: RunConfig,
) {
  try {
    const { data, error } = await supabase
      .from("scrape_runs")
      .insert({
        scraper_name: SCRAPER_NAME,
        scrape_mode: config.mode,
        source_host: config.primarySourceHost,
        publish_enabled: config.publish,
        target_count: config.selectedCities.length,
        max_concurrency: config.maxConcurrency,
        request_jitter_ms: config.priceSources[0]?.requestJitterMs ?? 0,
        retry_limit: config.priceSources[0]?.retryLimit ?? 0,
        proxy_label: config.proxyLabel,
        status: "running",
        config_snapshot: {
          source_key: config.primarySourceKey,
          source_hosts: config.priceSources.map((source) => source.sourceHost),
          city_count: config.selectedCities.length,
          proxy_enabled: Boolean(config.proxyUrlTemplate),
          failover_enabled: config.sourceFailoverEnabled,
          capture_blocked_html: config.captureBlockedHtml,
        },
      })
      .select("id")
      .single();

    if (error) {
      console.error("scrape_runs insert failed:", error.message);
      return null;
    }

    return data?.id ?? null;
  } catch (error) {
    console.error("scrape_runs insert failed:", error);
    return null;
  }
}

async function logRequestAttempts(
  supabase: ReturnType<typeof createClient>,
  requestLogs: RequestLogRow[],
) {
  if (!requestLogs.length) return;

  try {
    const { error } = await supabase.from("scrape_request_log").insert(requestLogs);
    if (error) {
      console.error("scrape_request_log insert failed:", error.message);
    }
  } catch (error) {
    console.error("scrape_request_log insert failed:", error);
  }
}

async function updateScrapeRun(
  supabase: ReturnType<typeof createClient>,
  runId: number | null,
  payload: Record<string, unknown>,
) {
  if (!runId) return;

  try {
    const { error } = await supabase
      .from("scrape_runs")
      .update({
        ...payload,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    if (error) {
      console.error("scrape_runs update failed:", error.message);
    }
  } catch (error) {
    console.error("scrape_runs update failed:", error);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  let governanceJobId: number | null = null;

  try {
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!cronSecret || token !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: CORS,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    await pruneExpiredRawSourceDocuments(supabase);

    const body = await readJsonBody(req);
    const config = await buildRunConfig(supabase, body);
    const configError = validateRunConfig(config);
    if (configError) {
      return new Response(
        JSON.stringify({ ok: false, error: configError }),
        { status: 400, headers: CORS },
      );
    }

    const runId = await createScrapeRun(supabase, config);
    const jobId = await createScrapeJob(supabase, {
      jobType: "price_scrape",
      sourceKey: config.primarySourceKey,
      triggerMode: config.mode === "sandbox" ? "manual" : "scheduled",
      payloadJson: {
        city_count: config.selectedCities.length,
        publish: config.publish,
        mode: config.mode,
        source_keys: config.priceSources.map((source) => source.sourceKey),
      },
    });
    governanceJobId = jobId;

    const { data: existingRows, error: existingError } = await supabase
      .from("lpg_prices")
      .select("city, state, product_type, price");

    if (existingError) {
      await finishScrapeJob(supabase, jobId, {
        status: "failed",
        lastError: existingError.message,
        resultJson: { city_count: config.selectedCities.length },
      });
      await updateScrapeRun(supabase, runId, {
        status: "failed",
        summary: { error: existingError.message },
      });
      return new Response(
        JSON.stringify({ ok: false, error: existingError.message }),
        { status: 500, headers: CORS },
      );
    }

    const previousPriceMap = new Map<string, number>();
    for (const row of existingRows ?? []) {
      previousPriceMap.set(`${row.city}::${row.product_type}`, Number(row.price));
    }

    const results: Array<{
      city: string;
      sourceUrl: string;
      accepted: number;
      held: number;
      missing: number;
      prices: Record<string, number | null>;
      status: "ok" | "partial" | "held";
      requestStatus: RequestStatus;
      sourceStatusCode: number | null;
      sourceKey: string;
      sourcePublishEnabled: boolean;
      usedFallback: boolean;
      attemptedSourceKeys: string[];
    }> = [];
    const upserts: Array<{
      city: string;
      state: string;
      product_type: ProductType;
      price: number;
      source_url: string;
      recorded_at: string;
    }> = [];
    const logs: PriceLogRow[] = [];
    const scrapeStartedAt = new Date().toISOString();

    const cityResults = await runWithConcurrency(
      config.selectedCities,
      config.maxConcurrency,
      async (cityConfig) => {
        const result = await scrapeCityWithFallback(cityConfig, runId, config);
        let rawDocumentAttemptId: number | null = null;

        for (let requestIndex = 0; requestIndex < result.requestLogs.length; requestIndex += 1) {
          const requestLog = result.requestLogs[requestIndex];
          const attemptId = await recordScrapeJobAttempt(supabase, {
            jobId,
            attemptNumber: requestIndex + 1,
            targetKey: result.city,
            requestUrl: requestLog.request_url,
            sourceUrl: requestLog.target_url,
            sourceHost: requestLog.source_host,
            status: mapRequestStatusToAttemptStatus(requestLog.request_status),
            httpStatus: requestLog.status_code,
            latencyMs: requestLog.latency_ms,
            errorMessage: requestLog.error_message,
            blockedSuspected: requestLog.blocked_suspected,
            rateLimited: requestLog.rate_limited,
          });

          if (requestLog.request_status === "success") {
            rawDocumentAttemptId = attemptId;
          } else if (!rawDocumentAttemptId && requestLog.blocked_suspected) {
            rawDocumentAttemptId = attemptId;
          }
        }

        if (result.rawHtml) {
          await storeRawSourceDocument(supabase, {
            jobId,
            attemptId: rawDocumentAttemptId,
            sourceKey: result.sourceKey,
            targetKey: result.city,
            documentKind: "html",
            sourceUrl: result.sourceUrl,
            contentText: result.rawHtml,
            retentionDays: config.rawDocumentRetentionDays,
            metadataJson: {
              request_status: result.requestStatus,
              source_status_code: result.sourceStatusCode,
              source_host: result.sourceHost,
              raw_html_kind: result.rawHtmlKind,
              attempted_source_keys: result.attemptedSourceKeys,
              used_fallback: result.usedFallback,
            },
          });
        }

        if (
          result.blockedDebugHtml &&
          result.blockedDebugSourceKey &&
          result.blockedDebugSourceUrl &&
          (result.rawHtmlKind !== "blocked" || result.blockedDebugHtml !== result.rawHtml)
        ) {
          await storeRawSourceDocument(supabase, {
            jobId,
            attemptId: null,
            sourceKey: result.blockedDebugSourceKey,
            targetKey: `${result.city}:blocked`,
            documentKind: "html",
            sourceUrl: result.blockedDebugSourceUrl,
            contentText: result.blockedDebugHtml,
            retentionDays: config.rawDocumentRetentionDays,
            metadataJson: {
              request_status: "blocked",
              source_host: result.blockedDebugSourceHost,
              raw_html_kind: "blocked",
              attempted_source_keys: result.attemptedSourceKeys,
              used_fallback: result.usedFallback,
              debug_snapshot: true,
            },
          });
        }

        return result;
      },
    );

    const requestLogs = cityResults.flatMap((result) => result.requestLogs);
    await logRequestAttempts(supabase, requestLogs);

    for (const cityResult of cityResults) {
      let accepted = 0;
      let held = 0;
      let missing = 0;
      const publishedPrices: Record<string, number | null> = {};

      for (const productType of PRODUCT_TYPES) {
        const candidate = cityResult.prices[productType];
        const previousPrice = previousPriceMap.get(`${cityResult.city}::${productType}`) ?? null;
        const validation = validateCandidate(candidate, previousPrice, productType);
        const sourcePublishBlocked = validation.accepted && candidate.price != null && !cityResult.sourcePublishEnabled;
        const effectiveValidation = sourcePublishBlocked
          ? {
            accepted: false,
            status: "rejected" as const,
            reason: `Accepted price from ${cityResult.sourceKey}, but publish is disabled for that source.`,
          }
          : validation;
        const publishedPrice =
          effectiveValidation.accepted && candidate.price != null ? candidate.price : previousPrice;

        if (effectiveValidation.status === "accepted" && candidate.price != null) {
          accepted += 1;
          if (config.publish) {
            upserts.push({
              city: cityResult.city,
              state: cityResult.state,
              product_type: productType,
              price: candidate.price,
              source_url: cityResult.sourceUrl,
              recorded_at: scrapeStartedAt,
            });
          }
        } else if (effectiveValidation.status === "rejected") {
          held += 1;
        } else {
          missing += 1;
        }

        publishedPrices[productType] = publishedPrice;

        if (config.publish) {
          logs.push({
            city: cityResult.city,
            state: cityResult.state,
            product_type: productType,
            source_url: cityResult.sourceUrl,
            candidate_price: candidate.price,
            published_price: publishedPrice,
            parse_method: candidate.parseMethod,
            validation_status: effectiveValidation.status,
            validation_reason: effectiveValidation.reason,
            scraped_at: scrapeStartedAt,
          });
        }
      }

      results.push({
        city: cityResult.city,
        sourceUrl: cityResult.sourceUrl,
        accepted,
        held,
        missing,
        prices: publishedPrices,
        status: accepted > 0 ? (held > 0 || missing > 0 ? "partial" : "ok") : "held",
        requestStatus: cityResult.requestStatus,
        sourceStatusCode: cityResult.sourceStatusCode,
        sourceKey: cityResult.sourceKey,
        sourcePublishEnabled: cityResult.sourcePublishEnabled,
        usedFallback: cityResult.usedFallback,
        attemptedSourceKeys: cityResult.attemptedSourceKeys,
      });
    }

    if (config.publish && upserts.length > 0) {
      const { error: dbError } = await supabase
        .from("lpg_prices")
        .upsert(upserts, { onConflict: "city,product_type" });

      if (dbError) {
        await finishScrapeJob(supabase, jobId, {
          status: "failed",
          lastError: dbError.message,
          resultJson: {
            attempted_cities: results.length,
            request_attempts: requestLogs.length,
          },
        });
        await updateScrapeRun(supabase, runId, {
          status: "failed",
          summary: { error: dbError.message },
        });
        return new Response(
          JSON.stringify({ ok: false, error: dbError.message }),
          { status: 500, headers: CORS },
        );
      }
    }

    if (config.publish && logs.length > 0) {
      const { error: logError } = await supabase
        .from("lpg_price_scrape_log")
        .insert(logs);

      if (logError) {
        console.error("lpg_price_scrape_log insert failed:", logError.message);
      }
    }

    if (config.publish) {
      const { error: refreshError } = await supabase.rpc("refresh_track_confidence_snapshots");
      if (refreshError) {
        console.error("refresh_track_confidence_snapshots failed:", refreshError.message);
      }
    }

    const successful = results.filter((r) => r.status === "ok").length;
    const partial = results.filter((r) => r.status === "partial").length;
    const held = results.filter((r) => r.status === "held").length;
    const rateLimitedRequests = requestLogs.filter((row) => row.rate_limited).length;
    const blockedRequests = requestLogs.filter((row) => row.blocked_suspected).length;
    const fallbackCities = results.filter((result) => result.usedFallback).length;
    const blockedSnapshots = cityResults.filter((result) => result.rawHtmlKind === "blocked").length;

    await updateScrapeRun(supabase, runId, {
      status: "completed",
      summary: {
        successful,
        partial,
        held,
        published_rows: upserts.length,
        request_attempts: requestLogs.length,
        rate_limited_requests: rateLimitedRequests,
        blocked_requests: blockedRequests,
        fallback_cities: fallbackCities,
        blocked_snapshots: blockedSnapshots,
      },
    });

    const jobStatus = successful === results.length ? "succeeded" : successful > 0 || partial > 0 ? "partial" : "failed";
    const responseOk = jobStatus !== "failed";
    const responseStatus = jobStatus === "failed" ? 502 : 200;
    const responseMessage =
      jobStatus === "succeeded"
        ? `${config.mode} scrape completed for ${results.length} cities`
        : jobStatus === "partial"
          ? `${config.mode} scrape partially completed for ${results.length} cities`
          : `${config.mode} scrape failed for ${results.length} cities`;

    await finishScrapeJob(supabase, jobId, {
      status: jobStatus,
      resultJson: {
        successful,
        partial,
        held,
        published_rows: upserts.length,
        request_attempts: requestLogs.length,
        rate_limited_requests: rateLimitedRequests,
        blocked_requests: blockedRequests,
        fallback_cities: fallbackCities,
        blocked_snapshots: blockedSnapshots,
      },
    });

    return new Response(
      JSON.stringify({
        ok: responseOk,
        jobStatus,
        scraper: SCRAPER_NAME,
        mode: config.mode,
        publish: config.publish,
        source_host: config.primarySourceHost,
        source_hosts: config.priceSources.map((source) => source.sourceHost),
        maxConcurrency: config.maxConcurrency,
        requestJitterMs: config.priceSources[0]?.requestJitterMs ?? 0,
        retryLimit: config.priceSources[0]?.retryLimit ?? 0,
        proxyLabel: config.proxyLabel,
        message: responseMessage,
        successful,
        partial,
        held,
        rateLimitedRequests,
        blockedRequests,
        fallbackCities,
        blockedSnapshots,
        results,
        updated_at: new Date().toISOString(),
      }),
      { status: responseStatus, headers: CORS },
    );
  } catch (err) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (governanceJobId && supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      await finishScrapeJob(supabase, governanceJobId, {
        status: "failed",
        lastError: String(err),
      });
    }
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: CORS },
    );
  }
});
