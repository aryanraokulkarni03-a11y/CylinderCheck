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
];

const FETCH_TIMEOUT_MS = 8000;

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

async function scrapeCityPrices(slug: string): Promise<{
  IndianOil: number | null;
  "HP Gas": number | null;
  "Bharat Gas": number | null;
}> {
  const result = { IndianOil: null as number | null, "HP Gas": null as number | null, "Bharat Gas": null as number | null };

  try {
    const url = `https://www.goodreturns.in/lpg-price-in-${slug}.html`;
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CylinderCheck/1.0; +https://cylindercheck.in)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return result;
    const html = await res.text();

    const companyPatterns: Array<{ key: keyof typeof result; patterns: RegExp[] }> = [
      {
        key: "IndianOil",
        patterns: [
          /indian\s*oil[^₹]*₹\s*([\d,]+(?:\.\d{1,2})?)/i,
          /indane[^₹]*₹\s*([\d,]+(?:\.\d{1,2})?)/i,
        ],
      },
      {
        key: "HP Gas",
        patterns: [
          /hp\s*gas[^₹]*₹\s*([\d,]+(?:\.\d{1,2})?)/i,
          /hindustan\s*petroleum[^₹]*₹\s*([\d,]+(?:\.\d{1,2})?)/i,
        ],
      },
      {
        key: "Bharat Gas",
        patterns: [
          /bharat\s*gas[^₹]*₹\s*([\d,]+(?:\.\d{1,2})?)/i,
          /bpcl[^₹]*₹\s*([\d,]+(?:\.\d{1,2})?)/i,
        ],
      },
    ];

    for (const { key, patterns } of companyPatterns) {
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          const price = parseFloat(match[1].replace(/,/g, ""));
          if (price >= 700 && price <= 1200) {
            result[key] = price;
            break;
          }
        }
      }
    }

    // Fallback: grab first 3 distinct LPG-range prices in page order
    if (!result.IndianOil && !result["HP Gas"] && !result["Bharat Gas"]) {
      const genericPrices: number[] = [];
      const allPriceMatches = html.matchAll(/₹\s*([\d,]+(?:\.\d{1,2})?)/g);
      for (const m of allPriceMatches) {
        const p = parseFloat(m[1].replace(/,/g, ""));
        if (p >= 700 && p <= 1200 && !genericPrices.includes(p)) {
          genericPrices.push(p);
          if (genericPrices.length === 3) break;
        }
      }
      if (genericPrices[0]) result.IndianOil = genericPrices[0];
      if (genericPrices[1]) result["HP Gas"] = genericPrices[1];
      if (genericPrices[2]) result["Bharat Gas"] = genericPrices[2];
    }

  } catch {
    // silent fail
  }

  return result;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // Auth: Bearer token must exactly match CRON_SECRET env var.
    // Set this in: Supabase Dashboard → Edge Functions → Secrets → CRON_SECRET
    // Use the same value in your cron job Authorization header: "Bearer <CRON_SECRET>"
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const results: { city: string; prices: Record<string, number | null>; status: string }[] = [];
    const upserts: {
      company: string;
      price: number;
      city: string;
      recorded_at: string;
    }[] = [];
    const scrapeStartedAt = new Date().toISOString();
    const cityResults = await Promise.all(
      CITIES.map(async ({ city, slug }) => {
        const prices = await scrapeCityPrices(slug);
        let gotAny = false;

        for (const [company, price] of Object.entries(prices)) {
          if (price !== null) {
            upserts.push({ company, price, city, recorded_at: scrapeStartedAt });
            gotAny = true;
          }
        }

        return { city, prices, status: gotAny ? "ok" : "failed" };
      })
    );

    results.push(...cityResults);

    if (upserts.length > 0) {
      const { error: dbError } = await supabase
        .from("lpg_prices")
        .upsert(upserts, { onConflict: "company,city" });

      if (dbError) {
        return new Response(
          JSON.stringify({ ok: false, error: dbError.message }),
          { status: 500, headers: CORS }
        );
      }
    }

    const successful = results.filter((r) => r.status === "ok").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Scraped ${successful}/${CITIES.length} cities — ${upserts.length} prices upserted, ${failed} failed`,
        results,
        updated_at: new Date().toISOString(),
      }),
      { headers: CORS }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: CORS }
    );
  }
});
