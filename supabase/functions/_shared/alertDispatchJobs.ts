import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type TriggerMode = "manual" | "scheduled" | "fallback";
type JobStatus = "queued" | "running" | "succeeded" | "failed" | "partial" | "cancelled";
type AttemptStatus = "running" | "sent" | "failed" | "skipped";
type FailureClass =
  | "invalid_contact"
  | "provider_rejected"
  | "transient_provider_error"
  | "network_error"
  | "config_error"
  | "unknown";

type CreateAlertDispatchJobInput = {
  jobKey?: string;
  triggerMode: TriggerMode;
  deliveryChannel?: string;
  provider?: string | null;
  reminderType?: string | null;
  payloadJson?: Record<string, unknown>;
};

type RecordAlertDispatchAttemptInput = {
  jobId: number | null;
  attemptNumber?: number;
  subscriptionId?: number | null;
  contact?: string | null;
  deliveryChannel?: string | null;
  reminderType?: string | null;
  scheduledFor?: string | null;
  provider?: string | null;
  idempotencyKey?: string | null;
  status?: AttemptStatus;
};

type FinishAlertDispatchAttemptInput = {
  status: AttemptStatus;
  failureClass?: FailureClass | null;
  httpStatus?: number | null;
  latencyMs?: number | null;
  errorMessage?: string | null;
  providerMessageId?: string | null;
  sentAt?: string | null;
};

type FinishAlertDispatchJobInput = {
  status: JobStatus;
  scannedCount?: number;
  sentCount?: number;
  failedCount?: number;
  skippedCount?: number;
  retryScheduledCount?: number;
  invalidContactCount?: number;
  providerRejectedCount?: number;
  transientFailureCount?: number;
  resultJson?: Record<string, unknown>;
  lastError?: string | null;
};

export async function createAlertDispatchJob(
  supabase: SupabaseClient,
  input: CreateAlertDispatchJobInput,
) {
  const jobKey = String(
    input.jobKey ??
      `alert_dispatch:${input.deliveryChannel ?? "email"}:${input.reminderType ?? "booking_d_minus_2"}:${new Date().toISOString()}`,
  ).trim();

  const { data, error } = await supabase
    .from("alert_dispatch_jobs")
    .insert({
      job_key: jobKey,
      trigger_mode: input.triggerMode,
      delivery_channel: input.deliveryChannel ?? "email",
      provider: input.provider ?? null,
      reminder_type: input.reminderType ?? null,
      status: "running",
      started_at: new Date().toISOString(),
      payload_json: input.payloadJson ?? {},
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return Number(data?.id) || null;
}

export async function recordAlertDispatchAttempt(
  supabase: SupabaseClient,
  input: RecordAlertDispatchAttemptInput,
) {
  if (!input.jobId) return null;

  const { data, error } = await supabase
    .from("alert_dispatch_attempts")
    .insert({
      job_id: input.jobId,
      attempt_number: input.attemptNumber ?? 1,
      subscription_id: input.subscriptionId ?? null,
      contact: input.contact ?? null,
      delivery_channel: input.deliveryChannel ?? "email",
      reminder_type: input.reminderType ?? null,
      scheduled_for: input.scheduledFor ?? null,
      provider: input.provider ?? null,
      idempotency_key: input.idempotencyKey ?? null,
      status: input.status ?? "running",
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return Number(data?.id) || null;
}

export async function finishAlertDispatchAttempt(
  supabase: SupabaseClient,
  attemptId: number | null,
  input: FinishAlertDispatchAttemptInput,
) {
  if (!attemptId) return;

  const { error } = await supabase
    .from("alert_dispatch_attempts")
    .update({
      status: input.status,
      failure_class: input.failureClass ?? null,
      http_status: input.httpStatus ?? null,
      latency_ms: input.latencyMs ?? null,
      error_message: input.errorMessage ?? null,
      provider_message_id: input.providerMessageId ?? null,
      sent_at: input.sentAt ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", attemptId);

  if (error) {
    throw error;
  }
}

export async function finishAlertDispatchJob(
  supabase: SupabaseClient,
  jobId: number | null,
  input: FinishAlertDispatchJobInput,
) {
  if (!jobId) return;

  const { error } = await supabase
    .from("alert_dispatch_jobs")
    .update({
      status: input.status,
      scanned_count: input.scannedCount ?? 0,
      sent_count: input.sentCount ?? 0,
      failed_count: input.failedCount ?? 0,
      skipped_count: input.skippedCount ?? 0,
      retry_scheduled_count: input.retryScheduledCount ?? 0,
      invalid_contact_count: input.invalidContactCount ?? 0,
      provider_rejected_count: input.providerRejectedCount ?? 0,
      transient_failure_count: input.transientFailureCount ?? 0,
      result_json: input.resultJson ?? {},
      last_error: input.lastError ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw error;
  }
}
