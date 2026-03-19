import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Content-Type": "application/json",
};

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
const FETCH_TIMEOUT_MS = 8000;
const MIN_PRICE = 700;
const MAX_PRICE_BY_TYPE = {
  domestic_14_2kg: 1400,
  commercial_19kg: 4000,
} as const;
const MAX_ABSOLUTE_DELTA = 120;
const MAX_PERCENT_DELTA = 0.12;
const MAX_ABSOLUTE_DELTA_BY_TYPE = {
  domestic_14_2kg: 120,
  commercial_19kg: 500,
} as const;

type ProductType = typeof PRODUCT_TYPES[number];

type ProductCandidate = {
  price: number | null;
  parseMethod: string | null;
  parseReason: string;
};

type CityScrapeResult = {
  city: string;
  state: string;
  sourceUrl: string;
  prices: Record<ProductType, ProductCandidate>;
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

const PRODUCT_PATTERNS: Array<{ key: ProductType; patterns: RegExp[] }> = [
  {
    key: "domestic_14_2kg",
    patterns: [
      /domestic\s*\(14\.2\s*kg\)\s*(?:₹|â‚¹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i,
      /domestic\s*\(14\.2\s*kg\)[\s\S]{0,80}?(?:₹|â‚¹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i,
    ],
  },
  {
    key: "commercial_19kg",
    patterns: [
      /commercial\s*\(19\s*kg\)\s*(?:₹|â‚¹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i,
      /commercial\s*\(19\s*kg\)[\s\S]{0,80}?(?:₹|â‚¹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i,
    ],
  },
];

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

function normalizeSourceText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#8377;|&#x20b9;|&rupee;/gi, "₹")
    .replace(/â‚¹/g, "₹")
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

async function scrapeCityPrices(city: string, slug: string): Promise<CityScrapeResult> {
  const sourceUrl = `https://www.goodreturns.in/lpg-price-in-${slug}.html`;
  const prices = emptyCandidates();
  const state = CITY_STATE_LABELS[city] || "";

  try {
    const res = await fetchWithTimeout(sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CylinderCheck/1.0; +https://cylindercheck.in)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      const reason = `Source returned ${res.status}`;
      for (const productType of PRODUCT_TYPES) {
        prices[productType] = {
          price: null,
          parseMethod: null,
          parseReason: reason,
        };
      }
      return { city, state, sourceUrl, prices };
    }

    const html = normalizeSourceText(await res.text());

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
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? "Timed out while reading source page"
        : "Failed to read source page";

    for (const productType of PRODUCT_TYPES) {
      prices[productType] = {
        price: null,
        parseMethod: null,
        parseReason: reason,
      };
    }
  }

  return { city, state, sourceUrl, prices };
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: existingRows, error: existingError } = await supabase
      .from("lpg_prices")
      .select("city, state, product_type, price");

    if (existingError) {
      return new Response(
        JSON.stringify({ ok: false, error: existingError.message }),
        { status: 500, headers: CORS },
      );
    }

    const previousPriceMap = new Map<string, number>();
    for (const row of existingRows ?? []) {
      const key = `${row.city}::${row.product_type}`;
      previousPriceMap.set(key, Number(row.price));
    }

    const results: Array<{
      city: string;
      sourceUrl: string;
      accepted: number;
      held: number;
      missing: number;
      prices: Record<string, number | null>;
      status: "ok" | "partial" | "held";
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

    const cityResults = await Promise.all(
      CITIES.map(({ city, slug }) => scrapeCityPrices(city, slug)),
    );

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
          upserts.push({
            city: cityResult.city,
            state: cityResult.state,
            product_type: productType,
            price: candidate.price,
            source_url: cityResult.sourceUrl,
            recorded_at: scrapeStartedAt,
          });
        } else if (validation.status === "rejected") {
          held += 1;
        } else {
          missing += 1;
        }

        publishedPrices[productType] = publishedPrice;
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

      results.push({
        city: cityResult.city,
        sourceUrl: cityResult.sourceUrl,
        accepted,
        held,
        missing,
        prices: publishedPrices,
        status: accepted > 0 ? (held > 0 || missing > 0 ? "partial" : "ok") : "held",
      });
    }

    if (upserts.length > 0) {
      const { error: dbError } = await supabase
        .from("lpg_prices")
        .upsert(upserts, { onConflict: "city,product_type" });

      if (dbError) {
        return new Response(
          JSON.stringify({ ok: false, error: dbError.message }),
          { status: 500, headers: CORS },
        );
      }
    }

    if (logs.length > 0) {
      const { error: logError } = await supabase
        .from("lpg_price_scrape_log")
        .insert(logs);

      if (logError) {
        console.error("lpg_price_scrape_log insert failed:", logError.message);
      }
    }

    const successful = results.filter((r) => r.status === "ok").length;
    const partial = results.filter((r) => r.status === "partial").length;
    const held = results.filter((r) => r.status === "held").length;

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Scraped ${results.length} cities — ${upserts.length} trusted prices published, ${partial} partial, ${held} held`,
        successful,
        partial,
        held,
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
