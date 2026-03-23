import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Content-Type": "application/json",
};

const SCRAPER_NAME = "scrape-prices";
const SOURCE_HOST = "www.goodreturns.in";
const FETCH_TIMEOUT_MS = 8000;
const DEFAULT_MAX_CONCURRENCY = 3;
const DEFAULT_REQUEST_JITTER_MS = 900;
const DEFAULT_RETRY_LIMIT = 1;
const DEFAULT_RETRY_BASE_DELAY_MS = 1400;

const CITIES = [
  { city: "Delhi", slug: "new-delhi" },
  { city: "Mumbai", slug: "mumbai" },
  { city: "Bangalore", slug: "bangalore" },
  { city: "Hyderabad", slug: "hyderabad" },
  { city: "Chennai", slug: "chennai" },
  { city: "Pune", slug: "pune" },
  { city: "Kolkata", slug: "kolkata" },
  { city: "Ahmedabad", slug: "ahmedabad" },
  { city: "Vizag", slug: "visakhapatnam" },
  { city: "Jaipur", slug: "jaipur" },
  { city: "Lucknow", slug: "lucknow" },
  { city: "Patna", slug: "patna" },
] as const;

const CITY_STATE_LABELS: Record<string, string> = {
  Delhi: "Delhi",
  Mumbai: "Maharashtra",
  Bangalore: "Karnataka",
  Hyderabad: "Telangana",
  Chennai: "Tamil Nadu",
  Pune: "Maharashtra",
  Kolkata: "West Bengal",
  Ahmedabad: "Gujarat",
  Vizag: "Andhra Pradesh",
  Jaipur: "Rajasthan",
  Lucknow: "Uttar Pradesh",
  Patna: "Bihar",
};

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
};

type CityScrapeResult = {
  city: string;
  state: string;
  sourceUrl: string;
  prices: Record<ProductType, ProductCandidate>;
  requestLogs: RequestLogRow[];
  requestStatus: RequestStatus;
  sourceStatusCode: number | null;
};

type RunConfig = {
  envRole: ScrapeMode;
  mode: ScrapeMode;
  publish: boolean;
  maxConcurrency: number;
  requestJitterMs: number;
  retryLimit: number;
  retryBaseDelayMs: number;
  proxyLabel: string | null;
  proxyUrlTemplate: string | null;
  proxyAuthHeaderName: string | null;
  proxyAuthHeaderValue: string | null;
  selectedCities: Array<(typeof CITIES)[number]>;
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

function shouldRetry(status: RequestStatus, attempt: number, retryLimit: number) {
  if (attempt >= retryLimit) return false;
  return status === "timeout" || status === "rate_limited" || status === "blocked" || status === "network_error";
}

async function fetchWithTimeout(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

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
): Promise<RequestFetchResult> {
  const requestLogs: RequestLogRow[] = [];

  for (let attempt = 0; attempt <= config.retryLimit; attempt += 1) {
    const { requestUrl, viaProxy } = buildOutboundUrl(sourceUrl, config);
    const loggedRequestUrl = sanitizeLoggedRequestUrl(requestUrl, viaProxy);
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (compatible; CylinderCheck/1.0; +https://cylindercheck.in)",
      "Accept": "text/html,application/xhtml+xml",
    };

    if (config.proxyAuthHeaderName && config.proxyAuthHeaderValue) {
      headers[config.proxyAuthHeaderName] = config.proxyAuthHeaderValue;
    }

    const jitterMs = randomJitter(config.requestJitterMs);
    if (jitterMs > 0) {
      await sleep(jitterMs);
    }

    const startedAt = Date.now();

    try {
      const res = await fetchWithTimeout(requestUrl, { headers });
      const latencyMs = Date.now() - startedAt;
      const html = await res.text();
      const requestStatus = classifyRequestStatus(res.status, html);
      const blocked = isBlockSuspected(res.status, html);

      requestLogs.push({
        run_id: runId,
        scraper_name: SCRAPER_NAME,
        scrape_mode: config.mode,
        source_host: SOURCE_HOST,
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
        };
      }

      if (!shouldRetry(requestStatus, attempt, config.retryLimit)) {
        return {
          html: null,
          requestLogs,
          requestStatus,
          finalStatusCode: res.status,
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
        source_host: SOURCE_HOST,
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

      if (!shouldRetry(requestStatus, attempt, config.retryLimit)) {
        return {
          html: null,
          requestLogs,
          requestStatus,
          finalStatusCode: null,
        };
      }
    }

    const backoffMs = config.retryBaseDelayMs * (attempt + 1);
    await sleep(backoffMs);
  }

  return {
    html: null,
    requestLogs,
    requestStatus: "network_error",
    finalStatusCode: null,
  };
}

async function scrapeCityPrices(
  city: string,
  slug: string,
  runId: number | null,
  config: RunConfig,
): Promise<CityScrapeResult> {
  const sourceUrl = `https://${SOURCE_HOST}/lpg-price-in-${slug}.html`;
  const prices = emptyCandidates();
  const state = CITY_STATE_LABELS[city] || "";
  const fetchResult = await fetchCityHtml(sourceUrl, city, runId, config);

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
      sourceUrl,
      prices,
      requestLogs: fetchResult.requestLogs,
      requestStatus: fetchResult.requestStatus,
      sourceStatusCode: fetchResult.finalStatusCode,
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
    sourceUrl,
    prices,
    requestLogs: fetchResult.requestLogs,
    requestStatus: fetchResult.requestStatus,
    sourceStatusCode: fetchResult.finalStatusCode,
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

function selectCities(cityInputs: unknown) {
  if (!Array.isArray(cityInputs) || !cityInputs.length) return [...CITIES];

  const requested = new Set(
    cityInputs
      .map((entry) => String(entry || "").trim().toLowerCase())
      .filter(Boolean),
  );

  const selected = CITIES.filter(({ city, slug }) =>
    requested.has(city.toLowerCase()) || requested.has(slug.toLowerCase())
  );

  return selected.length ? selected : [...CITIES];
}

function buildRunConfig(body: Record<string, unknown>): RunConfig {
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
      body.maxConcurrency != null ? String(body.maxConcurrency) : Deno.env.get("SCRAPE_MAX_CONCURRENCY"),
      DEFAULT_MAX_CONCURRENCY,
      1,
      12,
    ),
    requestJitterMs: parseInteger(
      body.requestJitterMs != null ? String(body.requestJitterMs) : Deno.env.get("SCRAPE_REQUEST_JITTER_MS"),
      DEFAULT_REQUEST_JITTER_MS,
      0,
      8000,
    ),
    retryLimit: parseInteger(
      body.retryLimit != null ? String(body.retryLimit) : Deno.env.get("SCRAPE_RETRY_LIMIT"),
      DEFAULT_RETRY_LIMIT,
      0,
      5,
    ),
    retryBaseDelayMs: parseInteger(
      body.retryBaseDelayMs != null ? String(body.retryBaseDelayMs) : Deno.env.get("SCRAPE_RETRY_BASE_DELAY_MS"),
      DEFAULT_RETRY_BASE_DELAY_MS,
      250,
      15000,
    ),
    proxyLabel: Deno.env.get("SCRAPE_PROXY_LABEL")?.trim() || null,
    proxyUrlTemplate: Deno.env.get("SCRAPE_PROXY_URL_TEMPLATE")?.trim() || null,
    proxyAuthHeaderName: Deno.env.get("SCRAPE_PROXY_AUTH_HEADER_NAME")?.trim() || null,
    proxyAuthHeaderValue: Deno.env.get("SCRAPE_PROXY_AUTH_HEADER_VALUE")?.trim() || null,
    selectedCities: selectCities(body.cities),
  };
}

function validateRunConfig(config: RunConfig) {
  if (config.mode !== config.envRole) {
    return `Requested ${config.mode} mode, but this function is configured as ${config.envRole}.`;
  }

  if (config.envRole === "sandbox" && config.publish) {
    return "Sandbox environment cannot publish live price updates.";
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
        source_host: SOURCE_HOST,
        publish_enabled: config.publish,
        target_count: config.selectedCities.length,
        max_concurrency: config.maxConcurrency,
        request_jitter_ms: config.requestJitterMs,
        retry_limit: config.retryLimit,
        proxy_label: config.proxyLabel,
        status: "running",
        config_snapshot: {
          city_count: config.selectedCities.length,
          proxy_enabled: Boolean(config.proxyUrlTemplate),
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

    const body = await readJsonBody(req);
    const config = buildRunConfig(body);
    const configError = validateRunConfig(config);
    if (configError) {
      return new Response(
        JSON.stringify({ ok: false, error: configError }),
        { status: 400, headers: CORS },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const runId = await createScrapeRun(supabase, config);

    const { data: existingRows, error: existingError } = await supabase
      .from("lpg_prices")
      .select("city, state, product_type, price");

    if (existingError) {
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
      ({ city, slug }) => scrapeCityPrices(city, slug, runId, config),
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
        const publishedPrice =
          validation.accepted && candidate.price != null ? candidate.price : previousPrice;

        if (validation.status === "accepted" && candidate.price != null) {
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
        } else if (validation.status === "rejected") {
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
            validation_status: validation.status,
            validation_reason: validation.reason,
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
      });
    }

    if (config.publish && upserts.length > 0) {
      const { error: dbError } = await supabase
        .from("lpg_prices")
        .upsert(upserts, { onConflict: "city,product_type" });

      if (dbError) {
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
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        scraper: SCRAPER_NAME,
        mode: config.mode,
        publish: config.publish,
        source_host: SOURCE_HOST,
        maxConcurrency: config.maxConcurrency,
        requestJitterMs: config.requestJitterMs,
        retryLimit: config.retryLimit,
        proxyLabel: config.proxyLabel,
        message: `${config.mode} scrape completed for ${results.length} cities`,
        successful,
        partial,
        held,
        rateLimitedRequests,
        blockedRequests,
        results,
        updated_at: new Date().toISOString(),
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
