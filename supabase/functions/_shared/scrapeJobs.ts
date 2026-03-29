import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type JobType = "price_scrape" | "news_scrape";
type JobStatus = "queued" | "running" | "succeeded" | "failed" | "partial" | "cancelled";
type TriggerMode = "manual" | "scheduled" | "fallback";
type AttemptStatus = "running" | "succeeded" | "failed" | "timeout" | "rate_limited" | "blocked" | "partial";
type DocumentKind = "html" | "rss" | "json";

type CreateScrapeJobInput = {
  jobType: JobType;
  jobKey?: string;
  sourceKey?: string | null;
  targetKey?: string | null;
  triggerMode?: TriggerMode;
  payloadJson?: Record<string, unknown>;
  status?: JobStatus;
};

type StartScrapeJobAttemptInput = {
  jobId: number | null;
  attemptNumber?: number;
  targetKey?: string | null;
  requestUrl?: string | null;
  sourceUrl?: string | null;
  sourceHost?: string | null;
};

type RecordScrapeJobAttemptInput = {
  jobId: number | null;
  attemptNumber?: number;
  targetKey?: string | null;
  requestUrl?: string | null;
  sourceUrl?: string | null;
  sourceHost?: string | null;
  status: AttemptStatus;
  httpStatus?: number | null;
  latencyMs?: number | null;
  errorMessage?: string | null;
  blockedSuspected?: boolean;
  rateLimited?: boolean;
  finishedAt?: string;
};

type FinishScrapeJobAttemptInput = {
  status: AttemptStatus;
  httpStatus?: number | null;
  latencyMs?: number | null;
  errorMessage?: string | null;
  blockedSuspected?: boolean;
  rateLimited?: boolean;
};

type FinishScrapeJobInput = {
  status: JobStatus;
  resultJson?: Record<string, unknown>;
  lastError?: string | null;
};

type StoreRawSourceDocumentInput = {
  jobId: number | null;
  attemptId?: number | null;
  sourceKey: string;
  targetKey?: string | null;
  documentKind: DocumentKind;
  sourceUrl: string;
  contentText: string;
  retentionDays?: number;
  metadataJson?: Record<string, unknown>;
  fetchedAt?: string;
};

function plusDaysIso(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function minusMsIso(ms: number) {
  return new Date(Date.now() - Math.max(0, ms)).toISOString();
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createScrapeJob(
  supabase: SupabaseClient,
  input: CreateScrapeJobInput,
) {
  try {
    const { data, error } = await supabase
      .from("scrape_jobs")
      .insert({
        job_type: input.jobType,
        job_key: input.jobKey || crypto.randomUUID(),
        source_key: input.sourceKey ?? null,
        target_key: input.targetKey ?? null,
        trigger_mode: input.triggerMode ?? "manual",
        payload_json: input.payloadJson ?? {},
        status: input.status ?? "running",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("scrape_jobs insert failed:", error.message);
      return null;
    }

    return Number(data?.id) || null;
  } catch (error) {
    console.error("scrape_jobs insert failed:", error);
    return null;
  }
}

export async function startScrapeJobAttempt(
  supabase: SupabaseClient,
  input: StartScrapeJobAttemptInput,
) {
  if (!input.jobId) return null;

  try {
    const { data, error } = await supabase
      .from("scrape_job_attempts")
      .insert({
        job_id: input.jobId,
        attempt_number: input.attemptNumber ?? 1,
        target_key: input.targetKey ?? null,
        status: "running",
        request_url: input.requestUrl ?? null,
        source_url: input.sourceUrl ?? null,
        source_host: input.sourceHost ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("scrape_job_attempts insert failed:", error.message);
      return null;
    }

    return Number(data?.id) || null;
  } catch (error) {
    console.error("scrape_job_attempts insert failed:", error);
    return null;
  }
}

export async function finishScrapeJobAttempt(
  supabase: SupabaseClient,
  attemptId: number | null,
  input: FinishScrapeJobAttemptInput,
) {
  if (!attemptId) return;

  try {
    const { error } = await supabase
      .from("scrape_job_attempts")
      .update({
        status: input.status,
        http_status: input.httpStatus ?? null,
        latency_ms: input.latencyMs ?? null,
        error_message: input.errorMessage ?? null,
        blocked_suspected: input.blockedSuspected ?? false,
        rate_limited: input.rateLimited ?? false,
        finished_at: new Date().toISOString(),
      })
      .eq("id", attemptId);

    if (error) {
      console.error("scrape_job_attempts update failed:", error.message);
    }
  } catch (error) {
    console.error("scrape_job_attempts update failed:", error);
  }
}

export async function recordScrapeJobAttempt(
  supabase: SupabaseClient,
  input: RecordScrapeJobAttemptInput,
) {
  if (!input.jobId) return null;

  const latencyMs = input.latencyMs ?? null;
  const finishedAt = input.finishedAt ?? new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from("scrape_job_attempts")
      .insert({
        job_id: input.jobId,
        attempt_number: input.attemptNumber ?? 1,
        target_key: input.targetKey ?? null,
        status: input.status,
        request_url: input.requestUrl ?? null,
        source_url: input.sourceUrl ?? null,
        source_host: input.sourceHost ?? null,
        http_status: input.httpStatus ?? null,
        latency_ms: latencyMs,
        error_message: input.errorMessage ?? null,
        blocked_suspected: input.blockedSuspected ?? false,
        rate_limited: input.rateLimited ?? false,
        started_at: latencyMs != null ? minusMsIso(latencyMs) : finishedAt,
        finished_at: finishedAt,
      })
      .select("id")
      .single();

    if (error) {
      console.error("scrape_job_attempts insert failed:", error.message);
      return null;
    }

    return Number(data?.id) || null;
  } catch (error) {
    console.error("scrape_job_attempts insert failed:", error);
    return null;
  }
}

export async function finishScrapeJob(
  supabase: SupabaseClient,
  jobId: number | null,
  input: FinishScrapeJobInput,
) {
  if (!jobId) return;

  try {
    const { error } = await supabase
      .from("scrape_jobs")
      .update({
        status: input.status,
        result_json: input.resultJson ?? {},
        last_error: input.lastError ?? null,
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (error) {
      console.error("scrape_jobs update failed:", error.message);
    }
  } catch (error) {
    console.error("scrape_jobs update failed:", error);
  }
}

export async function storeRawSourceDocument(
  supabase: SupabaseClient,
  input: StoreRawSourceDocumentInput,
) {
  if (!input.jobId) return;

  const contentText = String(input.contentText || "");
  if (!contentText) return;

  try {
    const { error } = await supabase
      .from("raw_source_documents")
      .insert({
        job_id: input.jobId,
        attempt_id: input.attemptId ?? null,
        source_key: input.sourceKey,
        target_key: input.targetKey ?? null,
        document_kind: input.documentKind,
        source_url: input.sourceUrl,
        content_text: contentText,
        content_hash: await sha256Hex(contentText),
        fetched_at: input.fetchedAt ?? new Date().toISOString(),
        retention_until: plusDaysIso(Math.max(1, Math.round(input.retentionDays ?? 7))),
        metadata_json: input.metadataJson ?? {},
      });

    if (error) {
      console.error("raw_source_documents insert failed:", error.message);
    }
  } catch (error) {
    console.error("raw_source_documents insert failed:", error);
  }
}

export async function pruneExpiredRawSourceDocuments(
  supabase: SupabaseClient,
) {
  try {
    const { error } = await supabase
      .from("raw_source_documents")
      .delete()
      .lt("retention_until", new Date().toISOString());

    if (error) {
      console.error("raw_source_documents cleanup failed:", error.message);
    }
  } catch (error) {
    console.error("raw_source_documents cleanup failed:", error);
  }
}
