import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Content-Type": "application/json",
};

// Cities and their goodreturns.in URL slugs
const CITIES = [
  { city: "Delhi", slug: "new-delhi", state: "Delhi" },
  { city: "Mumbai", slug: "mumbai", state: "Maharashtra" },
  { city: "Bangalore", slug: "bangalore", state: "Karnataka" },
  { city: "Hyderabad", slug: "hyderabad", state: "Telangana" },
  { city: "Chennai", slug: "chennai", state: "Tamil Nadu" },
  { city: "Pune", slug: "pune", state: "Maharashtra" },
  { city: "Kolkata", slug: "kolkata", state: "West Bengal" },
  { city: "Ahmedabad", slug: "ahmedabad", state: "Gujarat" },
  { city: "Vizag", slug: "visakhapatnam", state: "Andhra Pradesh" },
  { city: "Jaipur", slug: "jaipur", state: "Rajasthan" },
  { city: "Lucknow", slug: "lucknow", state: "Uttar Pradesh" },
  { city: "Patna", slug: "patna", state: "Bihar" },
];

// Scrape price for a single city from goodreturns.in
async function scrapeCityPrice(slug: string): Promise<number | null> {
  try {
    const url = `https://www.goodreturns.in/lpg-price-in-${slug}.html`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CylinderCheck/1.0; +https://cylindercheck.in)",
        "Accept": "text/html",
      },
    });

    if (!res.ok) return null;
    const html = await res.text();

    // goodreturns shows price in a span with class "sub_price" or similar
    // Pattern: ₹XXX.XX or Rs. XXX.XX
    const patterns = [
      /₹\s*([\d,]+(?:\.\d{1,2})?)/,
      /Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/i,
      /price[^>]*>\s*₹?\s*([\d,]+(?:\.\d{1,2})?)/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const price = parseFloat(match[1].replace(/,/g, ""));
        // Sanity check — LPG prices are between ₹700 and ₹1200
        if (price >= 700 && price <= 1200) return price;
      }
    }
    return null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // Optional: validate that this is called by cron or admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
    const isCron = authHeader === `Bearer ${cronSecret}`;
    const isSupabase = authHeader.includes(Deno.env.get("SUPABASE_ANON_KEY") ?? "___");

    if (!isCron && !isSupabase) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: CORS,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const results: { city: string; price: number | null; status: string }[] = [];
    const upserts: {
      company: string;
      price: number;
      city: string;
      recorded_at: string;
    }[] = [];

    // Scrape all cities (sequential to avoid rate limiting)
    for (const { city, slug } of CITIES) {
      const price = await scrapeCityPrice(slug);

      if (price) {
        // goodreturns shows a composite price — we store as IndianOil
        // HP Gas and Bharat Gas are typically ±₹3 — derive them
        upserts.push({
          company: "IndianOil",
          price,
          city,
          recorded_at: new Date().toISOString(),
        });
        upserts.push({
          company: "HP Gas",
          price: price + 3,
          city,
          recorded_at: new Date().toISOString(),
        });
        upserts.push({
          company: "Bharat Gas",
          price: price - 2,
          city,
          recorded_at: new Date().toISOString(),
        });

        results.push({ city, price, status: "ok" });
      } else {
        results.push({ city, price: null, status: "failed" });
      }

      // Small delay between requests to be polite
      await new Promise((r) => setTimeout(r, 800));
    }

    // Insert all prices into Supabase (keeps price history)
    if (upserts.length > 0) {
      const { error: dbError } = await supabase
        .from("lpg_prices")
        .insert(upserts);

      if (dbError) {
        console.error("DB upsert error:", dbError);
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
        message: `Scraped ${successful} cities successfully, ${failed} failed`,
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
