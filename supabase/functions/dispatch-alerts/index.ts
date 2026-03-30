import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  calculateNextSendAt,
  formatBookingReminderEmail,
  normalizeReminderEmail,
} from "../_shared/alerts.ts";
import {
  createAlertDispatchJob,
  finishAlertDispatchAttempt,
  finishAlertDispatchJob,
  recordAlertDispatchAttempt,
} from "../_shared/alertDispatchJobs.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Content-Type": "application/json",
};

const DEFAULT_PROVIDER = "resend";
const DEFAULT_BATCH_LIMIT = 200;
const DEFAULT_RETRY_DELAY_MINUTES = 120;
const DEFAULT_REMINDER_TYPE = "booking_d_minus_2";
const DEFAULT_DELIVERY_CHANNEL = "email";
const RESEND_API_URL = "https://api.resend.com/emails";

type TriggerMode = "manual" | "scheduled" | "fallback";
type AttemptFailureClass =
  | "invalid_contact"
  | "provider_rejected"
  | "transient_provider_error"
  | "network_error"
  | "config_error"
  | "unknown";

type AlertSubscriptionRow = {
  id: number;
  contact: string;
  last_booking: string | null;
  next_send_at: string | null;
  last_sent_at: string | null;
  delivery_status: string | null;
};

type ReminderSendResult = {
  providerMessageId: string | null;
  httpStatus: number;
};

class AlertDispatchError extends Error {
  failureClass: AttemptFailureClass;
  httpStatus: number | null;
  retryable: boolean;

  constructor(message: string, options: {
    failureClass: AttemptFailureClass;
    httpStatus?: number | null;
    retryable?: boolean;
  }) {
    super(message);
    this.name = "AlertDispatchError";
    this.failureClass = options.failureClass;
    this.httpStatus = options.httpStatus ?? null;
    this.retryable = options.retryable ?? false;
  }
}

function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers: CORS });
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

function parsePositiveInteger(value: string | null | undefined, fallback: number, min: number, max: number) {
  const numeric = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function parseTriggerMode(value: unknown): TriggerMode {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "manual" || normalized === "fallback") return normalized;
  return "scheduled";
}

function classifyProviderFailure(httpStatus: number | null, message: string) {
  if (httpStatus === 408 || httpStatus === 409 || httpStatus === 425 || httpStatus === 429) {
    return {
      failureClass: "transient_provider_error" as const,
      retryable: true,
    };
  }

  if (httpStatus != null && httpStatus >= 500) {
    return {
      failureClass: "transient_provider_error" as const,
      retryable: true,
    };
  }

  const normalizedMessage = message.toLowerCase();
  if (
    normalizedMessage.includes("timeout") ||
    normalizedMessage.includes("temporarily unavailable") ||
    normalizedMessage.includes("try again later")
  ) {
    return {
      failureClass: "transient_provider_error" as const,
      retryable: true,
    };
  }

  return {
    failureClass: "provider_rejected" as const,
    retryable: false,
  };
}

async function sendReminderEmail({
  apiKey,
  from,
  replyTo,
  to,
  subject,
  html,
  text,
  idempotencyKey,
}: {
  apiKey: string;
  from: string;
  replyTo: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}): Promise<ReminderSendResult> {
  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: replyTo,
        subject,
        html,
        text,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = String(
        payload?.message ||
        payload?.error?.message ||
        payload?.name ||
        "Email send failed",
      );
      const classified = classifyProviderFailure(response.status, message);
      throw new AlertDispatchError(message, {
        failureClass: classified.failureClass,
        httpStatus: response.status,
        retryable: classified.retryable,
      });
    }

    return {
      providerMessageId: payload?.id ? String(payload.id) : null,
      httpStatus: response.status,
    };
  } catch (error) {
    if (error instanceof AlertDispatchError) {
      throw error;
    }

    throw new AlertDispatchError(
      error instanceof Error ? error.message : "Network error while sending alert",
      {
        failureClass: "network_error",
        retryable: true,
      },
    );
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  let jobId: number | null = null;

  try {
    const configuredSecret = String(Deno.env.get("ALERTS_CRON_SECRET") ?? "").trim();
    if (!configuredSecret) {
      return jsonResponse(500, {
        ok: false,
        error: "ALERTS_CRON_SECRET is not configured",
      });
    }

    const token = getBearerToken(req);
    if (!token || token !== configuredSecret) {
      return jsonResponse(401, { ok: false, error: "Unauthorized" });
    }

    const body = await req.json().catch(() => ({}));
    const triggerMode = parseTriggerMode(body.triggerMode);
    const batchLimit = parsePositiveInteger(
      body.limit != null ? String(body.limit) : Deno.env.get("ALERT_DISPATCH_BATCH_LIMIT"),
      DEFAULT_BATCH_LIMIT,
      1,
      500,
    );
    const retryDelayMinutes = parsePositiveInteger(
      Deno.env.get("ALERT_DISPATCH_RETRY_DELAY_MINUTES"),
      DEFAULT_RETRY_DELAY_MINUTES,
      5,
      1440,
    );

    const supabase = createServiceClient();
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const resendFrom = Deno.env.get("RESEND_FROM_EMAIL") ?? "CylinderCheck <hello@cylindercheck.in>";
    const replyTo = Deno.env.get("SUPPORT_REPLY_TO") ?? "xisch.co@gmail.com";
    const reminderType = DEFAULT_REMINDER_TYPE;
    const deliveryChannel = DEFAULT_DELIVERY_CHANNEL;
    const provider = DEFAULT_PROVIDER;

    jobId = await createAlertDispatchJob(supabase, {
      triggerMode,
      deliveryChannel,
      provider,
      reminderType,
      payloadJson: {
        limit: batchLimit,
        retry_delay_minutes: retryDelayMinutes,
      },
    });

    if (!resendApiKey) {
      await finishAlertDispatchJob(supabase, jobId, {
        status: "failed",
        lastError: "RESEND_API_KEY is missing",
        resultJson: {
          provider,
          delivery_channel: deliveryChannel,
          reminder_type: reminderType,
        },
      });
      return jsonResponse(500, {
        ok: false,
        error: "Resend credentials are missing",
      });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const retryAtIso = new Date(now.getTime() + retryDelayMinutes * 60 * 1000).toISOString();
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { data: subscriptions, error } = await supabase
      .from("alert_subscriptions")
      .select("id, contact, last_booking, next_send_at, last_sent_at, delivery_status")
      .eq("active", true)
      .eq("channel", deliveryChannel)
      .eq("plan_code", "free")
      .eq("reminder_type", reminderType)
      .in("delivery_status", ["pending", "scheduled"])
      .or(`next_send_at.is.null,next_send_at.lte.${nowIso}`)
      .order("next_send_at", { ascending: true, nullsFirst: true })
      .limit(batchLimit);

    if (error) {
      throw error;
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let retryScheduled = 0;
    let invalidContacts = 0;
    let providerRejected = 0;
    let transientFailures = 0;
    let lastError: string | null = null;

    for (const subscription of (subscriptions ?? []) as AlertSubscriptionRow[]) {
      const dueAt = subscription.next_send_at || calculateNextSendAt(subscription.last_booking);
      const idempotencyKey = `alert:${reminderType}:${subscription.id}:${dueAt ?? "missing_due_at"}`;
      const attemptId = await recordAlertDispatchAttempt(supabase, {
        jobId,
        attemptNumber: 1,
        subscriptionId: subscription.id,
        contact: subscription.contact,
        deliveryChannel,
        reminderType,
        scheduledFor: dueAt,
        provider,
        idempotencyKey,
      });

      if (!subscription.last_booking || !dueAt) {
        skipped += 1;
        await supabase
          .from("alert_subscriptions")
          .update({
            delivery_status: "needs_booking_date",
            next_send_at: null,
            last_error: null,
          })
          .eq("id", subscription.id);

        await finishAlertDispatchAttempt(supabase, attemptId, {
          status: "skipped",
          sentAt: null,
        });
        continue;
      }

      if (new Date(dueAt).getTime() > Date.now()) {
        skipped += 1;
        await supabase
          .from("alert_subscriptions")
          .update({
            delivery_status: "scheduled",
            next_send_at: dueAt,
            last_error: null,
          })
          .eq("id", subscription.id);

        await finishAlertDispatchAttempt(supabase, attemptId, {
          status: "skipped",
          sentAt: null,
        });
        continue;
      }

      if (subscription.last_sent_at) {
        skipped += 1;
        await finishAlertDispatchAttempt(supabase, attemptId, {
          status: "skipped",
          sentAt: subscription.last_sent_at,
        });
        continue;
      }

      const to = normalizeReminderEmail(subscription.contact);
      if (!to) {
        failed += 1;
        invalidContacts += 1;
        lastError = "One or more alert contacts were invalid";

        const invalidMessage = "Contact is not a valid email address";
        await supabase
          .from("alert_subscriptions")
          .update({
            delivery_status: "failed",
            last_error: invalidMessage,
            next_send_at: null,
          })
          .eq("id", subscription.id);

        await finishAlertDispatchAttempt(supabase, attemptId, {
          status: "failed",
          failureClass: "invalid_contact",
          errorMessage: invalidMessage,
        });
        continue;
      }

      const email = formatBookingReminderEmail(subscription.last_booking);
      const startedAt = Date.now();

      try {
        const result = await sendReminderEmail({
          apiKey: resendApiKey,
          from: resendFrom,
          replyTo,
          to,
          subject: email.subject,
          html: email.html,
          text: email.text,
          idempotencyKey,
        });

        const sentAt = new Date().toISOString();
        sent += 1;

        const { error: updateError } = await supabase
          .from("alert_subscriptions")
          .update({
            delivery_status: "sent",
            last_sent_at: sentAt,
            last_error: null,
            next_send_at: dueAt,
          })
          .eq("id", subscription.id);

        if (updateError) {
          throw updateError;
        }

        await finishAlertDispatchAttempt(supabase, attemptId, {
          status: "sent",
          httpStatus: result.httpStatus,
          latencyMs: Date.now() - startedAt,
          providerMessageId: result.providerMessageId,
          sentAt,
        });
      } catch (error) {
        const latencyMs = Date.now() - startedAt;
        const dispatchError = error instanceof AlertDispatchError
          ? error
          : new AlertDispatchError(String(error), {
            failureClass: "unknown",
            retryable: false,
          });

        failed += 1;
        lastError = dispatchError.message;

        if (dispatchError.failureClass === "provider_rejected") {
          providerRejected += 1;
        }
        if (dispatchError.failureClass === "transient_provider_error" || dispatchError.failureClass === "network_error") {
          transientFailures += 1;
        }

        const nextSendAt = dispatchError.retryable ? retryAtIso : null;
        if (dispatchError.retryable) {
          retryScheduled += 1;
        }

        const { error: updateError } = await supabase
          .from("alert_subscriptions")
          .update({
            delivery_status: dispatchError.retryable ? "scheduled" : "failed",
            last_error: dispatchError.message,
            next_send_at: nextSendAt,
          })
          .eq("id", subscription.id);

        if (updateError) {
          throw updateError;
        }

        await finishAlertDispatchAttempt(supabase, attemptId, {
          status: "failed",
          failureClass: dispatchError.failureClass,
          httpStatus: dispatchError.httpStatus,
          latencyMs,
          errorMessage: dispatchError.message,
        });
      }
    }

    const { count: sentToday } = await supabase
      .from("alert_subscriptions")
      .select("*", { head: true, count: "exact" })
      .gte("last_sent_at", todayStart.toISOString());

    const scanned = subscriptions?.length || 0;
    const jobStatus =
      failed === 0
        ? "succeeded"
        : sent > 0 || skipped > 0
          ? "partial"
          : "failed";
    const responseStatus = jobStatus === "failed" ? 502 : 200;
    const responseOk = jobStatus !== "failed";

    await finishAlertDispatchJob(supabase, jobId, {
      status: jobStatus,
      scannedCount: scanned,
      sentCount: sent,
      failedCount: failed,
      skippedCount: skipped,
      retryScheduledCount: retryScheduled,
      invalidContactCount: invalidContacts,
      providerRejectedCount: providerRejected,
      transientFailureCount: transientFailures,
      lastError,
      resultJson: {
        provider,
        delivery_channel: deliveryChannel,
        reminder_type: reminderType,
        sent_today: sentToday || 0,
      },
    });

    return jsonResponse(responseStatus, {
      ok: responseOk,
      jobStatus,
      dispatcher: "dispatch-alerts",
      provider,
      deliveryChannel,
      reminderType,
      scanned,
      sent,
      failed,
      skipped,
      retryScheduled,
      invalidContacts,
      providerRejected,
      transientFailures,
      sentToday: sentToday || 0,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (jobId && supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      await finishAlertDispatchJob(supabase, jobId, {
        status: "failed",
        lastError: String(err),
      });
    }

    return jsonResponse(500, { ok: false, error: String(err) });
  }
});
