import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildNewsArticleCandidates, loadNewsScrapeConfig, scrapeLatestNews } from "../_shared/news.ts";
import { requireProjectActive } from "../_shared/projectLifecycle.ts";
import {
  createScrapeJob,
  finishScrapeJob,
  finishScrapeJobAttempt,
  pruneExpiredRawSourceDocuments,
  startScrapeJobAttempt,
  storeRawSourceDocument,
} from "../_shared/scrapeJobs.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Content-Type": "application/json",
};

function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  let governanceJobId: number | null = null;

  try {
    const lifecycle = await requireProjectActive({
      supabase: createServiceClient(),
      functionName: "scrape-news",
      baseHeaders: CORS,
    });
    if (!lifecycle.ok) {
      return lifecycle.response;
    }

    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
    const token = getBearerToken(req);

    if (!cronSecret || token !== cronSecret) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: CORS },
      );
    }

    const supabase = createServiceClient();
    await pruneExpiredRawSourceDocuments(supabase);
    const config = await loadNewsScrapeConfig(supabase);
    const jobId = await createScrapeJob(supabase, {
      jobType: "news_scrape",
      sourceKey: config.sourceKey,
      triggerMode: "scheduled",
      payloadJson: {
        query_count: config.queries.length,
        news_limit: config.newsLimit,
      },
    });
    governanceJobId = jobId;

    let feedAttempts = 0;
    let feedSuccesses = 0;
    let feedFailures = 0;
    const articles = await scrapeLatestNews(config, {
      onFeedFetch: async (event) => {
        feedAttempts += 1;
        if (event.status === "succeeded") {
          feedSuccesses += 1;
        } else {
          feedFailures += 1;
        }
        const attemptId = await startScrapeJobAttempt(supabase, {
          jobId: jobId ?? null,
          attemptNumber: feedAttempts,
          targetKey: event.query,
          requestUrl: event.requestUrl,
          sourceUrl: event.sourceUrl,
          sourceHost: config.sourceHost,
        });

        await finishScrapeJobAttempt(supabase, attemptId, {
          status: event.status,
          httpStatus: event.httpStatus,
          latencyMs: event.latencyMs,
          errorMessage: event.errorMessage,
          blockedSuspected: false,
          rateLimited: event.httpStatus === 429,
        });

        if (jobId && event.contentText) {
          await storeRawSourceDocument(supabase, {
            jobId,
            attemptId,
            sourceKey: config.sourceKey,
            targetKey: event.query,
            documentKind: "rss",
            sourceUrl: event.sourceUrl,
            contentText: event.contentText,
            retentionDays: config.rawDocumentRetentionDays,
            fetchedAt: event.fetchedAt,
            metadataJson: {
              query: event.query,
              http_status: event.httpStatus,
              status: event.status,
            },
          });
        }
      },
    });

    let candidateCount = 0;

    if (articles.length) {
      const { error: upsertError } = await supabase
        .from("news_articles")
        .upsert(articles, { onConflict: "article_key" });

      if (upsertError) {
        await finishScrapeJob(supabase, jobId, {
          status: "failed",
          lastError: upsertError.message,
          resultJson: {
            feed_attempts: feedAttempts,
            feed_successes: feedSuccesses,
            feed_failures: feedFailures,
            normalized_count: articles.length,
            candidate_count: candidateCount,
          },
        });
        throw upsertError;
      }

      const candidates = await buildNewsArticleCandidates(config.sourceKey, articles);
      candidateCount = candidates.length;
      const { error: candidateUpsertError } = await supabase
        .from("news_article_candidates")
        .upsert(candidates, { onConflict: "candidate_key" });

      if (candidateUpsertError) {
        await finishScrapeJob(supabase, jobId, {
          status: "failed",
          lastError: candidateUpsertError.message,
          resultJson: {
            feed_attempts: feedAttempts,
            feed_successes: feedSuccesses,
            feed_failures: feedFailures,
            normalized_count: articles.length,
            candidate_count: candidateCount,
          },
        });
        throw candidateUpsertError;
      }
    }

    const retentionDays = Math.max(1, Math.round(config.retentionDays));
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const { error: pruneError } = await supabase
      .from("news_articles")
      .delete()
      .lt("published_at", cutoff);

    if (pruneError) {
        await finishScrapeJob(supabase, jobId, {
          status: "failed",
          lastError: pruneError.message,
          resultJson: {
            feed_attempts: feedAttempts,
            feed_successes: feedSuccesses,
            feed_failures: feedFailures,
            normalized_count: articles.length,
            candidate_count: candidateCount,
            retention_days: retentionDays,
          },
      });
      throw pruneError;
    }

    const finalStatus =
      feedAttempts === 0 || feedSuccesses === 0
        ? "failed"
        : feedFailures > 0
          ? "partial"
          : "succeeded";

    await finishScrapeJob(supabase, jobId, {
      status: finalStatus,
      resultJson: {
        feed_attempts: feedAttempts,
        feed_successes: feedSuccesses,
        feed_failures: feedFailures,
        normalized_count: articles.length,
        candidate_count: candidateCount,
        retention_days: retentionDays,
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Scraped ${articles.length} normalized news articles`,
        scraped_count: articles.length,
        candidate_count: candidateCount,
        updated_at: new Date().toISOString(),
        schedule_ist: ["07:00", "19:00"],
        retention_days: retentionDays,
      }),
      { headers: CORS },
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
