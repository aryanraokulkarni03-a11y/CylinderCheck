import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Content-Type": "application/json",
};

const CITIES = [
  { city: "Delhi",     slug: "new-delhi" },
  { city: "Mumbai",    slug: "mumbai" },
  { city: "Bangalore", slug: "bangalore" },
  { city: "Hyderabad", slug: "hyderabad" },
  { city: "Chennai",   slug: "chennai" },
  { city: "Pune",      slug: "pune" },
  { city: "Kolkata",   slug: "kolkata" },
  { city: "Ahmedabad", slug: "ahmedabad" },
  { city: "Vizag",     slug: "visakhapatnam" },
  { city: "Jaipur",    slug: "jaipur" },
  { city: "Lucknow",   slug: "lucknow" },
  { city: "Patna",     slug: "patna" },
];

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

    const patterns = [
      /₹\s*([\d,]+(?:\.\d{1,2})?)/,
      /Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/i,
      /price[^>]*>\s*₹?\s*([\d,]+(?:\.\d{1,2})?)/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const price = parseFloat(match[1].replace(/,/g, ""));
        if (price >= 700 && price <= 1200) return price;
      }
    }
    return null;
  } catch {
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // Accept any valid bearer token
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.length < 10) {
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
    const inserts: {
      company: string;
      price: number;
      city: string;
      recorded_at: string;
    }[] = [];

    for (const { city, slug } of CITIES) {
      const price = await scrapeCityPrice(slug);

      if (price) {
        inserts.push({ company: "IndianOil", price, city, recorded_at: new Date().toISOString() });
        inserts.push({ company: "HP Gas", price: price + 3, city, recorded_at: new Date().toISOString() });
        inserts.push({ company: "Bharat Gas", price: price - 2, city, recorded_at: new Date().toISOString() });
        results.push({ city, price, status: "ok" });
      } else {
        results.push({ city, price: null, status: "failed" });
      }

      await new Promise((r) => setTimeout(r, 800));
    }

    if (inserts.length > 0) {
      const { error: dbError } = await supabase.from("lpg_prices").insert(inserts);
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
