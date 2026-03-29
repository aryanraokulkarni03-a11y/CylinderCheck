import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type RegistryCityRow = {
  city_key: string;
  city_name: string;
  canonical_slug: string;
  state_name: string;
  price_source_slug: string | null;
  aliases: string[] | null;
  display_priority: number;
  household_seo_enabled: boolean;
  commercial_seo_enabled: boolean;
  price_scrape_enabled: boolean;
  news_enabled: boolean;
  news_location_enabled: boolean;
};

export type ScrapeSourceRow = {
  source_key: string;
  source_name: string;
  source_kind: "price" | "news" | "shared";
  fetch_mode: "html" | "rss" | "api" | "manual";
  host: string | null;
  base_url: string;
  enabled: boolean;
  publish_enabled: boolean;
  priority: number;
  timeout_ms: number;
  request_jitter_ms: number;
  retry_limit: number;
  retry_base_delay_ms: number;
  config: Record<string, unknown> | null;
};

export type ScrapeTopicRow = {
  topic_key: string;
  source_key: string;
  topic_label: string;
  query_text: string;
  category: string;
  enabled: boolean;
  priority: number;
  metadata: Record<string, unknown> | null;
};

function asNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function readRuntimeConfig(
  supabase: SupabaseClient,
  scope: "price_scraper" | "news_scraper" | "global",
) {
  const { data, error } = await supabase
    .from("scrape_runtime_config")
    .select("config_key, value_json, enabled")
    .eq("enabled", true)
    .in("config_scope", ["global", scope]);

  if (error) throw error;

  return Object.fromEntries(
    (data ?? []).map((row) => [row.config_key, row.value_json]),
  ) as Record<string, unknown>;
}

export async function readPrimaryScrapeSource(
  supabase: SupabaseClient,
  sourceKind: "price" | "news",
) {
  const { data, error } = await supabase
    .from("scrape_source_registry")
    .select("source_key, source_name, source_kind, fetch_mode, host, base_url, enabled, publish_enabled, priority, timeout_ms, request_jitter_ms, retry_limit, retry_base_delay_ms, config")
    .eq("source_kind", sourceKind)
    .eq("enabled", true)
    .order("priority", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`No enabled ${sourceKind} scrape source is configured.`);
  return data as ScrapeSourceRow;
}

export async function readEnabledCities(
  supabase: SupabaseClient,
  flag: "price_scrape_enabled" | "news_enabled" | "news_location_enabled" | "household_seo_enabled",
) {
  const { data, error } = await supabase
    .from("city_registry")
    .select("city_key, city_name, canonical_slug, state_name, price_source_slug, aliases, display_priority, household_seo_enabled, commercial_seo_enabled, price_scrape_enabled, news_enabled, news_location_enabled")
    .eq(flag, true)
    .order("display_priority", { ascending: true });

  if (error) throw error;
  return (data ?? []) as RegistryCityRow[];
}

export async function readActiveNewsTopics(
  supabase: SupabaseClient,
  sourceKey: string,
) {
  const { data, error } = await supabase
    .from("scrape_topic_registry")
    .select("topic_key, source_key, topic_label, query_text, category, enabled, priority, metadata")
    .eq("source_key", sourceKey)
    .eq("enabled", true)
    .order("priority", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ScrapeTopicRow[];
}

export function resolvePriceRuntimeDefaults(
  runtimeConfig: Record<string, unknown>,
  source: ScrapeSourceRow,
) {
  return {
    fetchTimeoutMs: asNumber(runtimeConfig.price_fetch_timeout_ms, source.timeout_ms),
    maxConcurrency: asNumber(runtimeConfig.price_max_concurrency, 3),
    requestJitterMs: asNumber(runtimeConfig.price_request_jitter_ms, source.request_jitter_ms),
    retryLimit: asNumber(runtimeConfig.price_retry_limit, source.retry_limit),
    retryBaseDelayMs: asNumber(runtimeConfig.price_retry_base_delay_ms, source.retry_base_delay_ms),
    rawDocumentRetentionDays: asNumber(runtimeConfig.raw_document_retention_days, 7),
  };
}

export function resolveNewsRuntimeDefaults(
  runtimeConfig: Record<string, unknown>,
  source: ScrapeSourceRow,
) {
  return {
    newsLimit: asNumber(runtimeConfig.news_limit, 8),
    decodeTimeoutMs: asNumber(runtimeConfig.news_decode_timeout_ms, 1800),
    retentionDays: asNumber(runtimeConfig.news_retention_days, 14),
    requestTimeoutMs: asNumber(runtimeConfig.news_fetch_timeout_ms, source.timeout_ms),
    rawDocumentRetentionDays: asNumber(runtimeConfig.raw_document_retention_days, 7),
  };
}

export function buildCityAliasLookup(cities: RegistryCityRow[]) {
  const lookup = new Map<string, string>();
  const stateFallback = new Map<string, string>();

  for (const city of cities) {
    if (!stateFallback.has(city.state_name.toLowerCase())) {
      stateFallback.set(city.state_name.toLowerCase(), city.city_name);
    }

    const aliases = [
      city.city_name,
      city.city_key,
      city.canonical_slug,
      city.price_source_slug,
      ...(city.aliases ?? []),
    ]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);

    for (const alias of aliases) {
      lookup.set(alias, city.city_name);
    }
  }

  for (const [stateName, cityName] of stateFallback.entries()) {
    lookup.set(stateName, cityName);
  }

  return lookup;
}
