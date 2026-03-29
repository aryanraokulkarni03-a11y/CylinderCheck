import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Content-Type": "application/json",
};

type EditorialAction = "approve" | "reject" | "publish" | "archive";
type EditorialRole = "editor" | "publisher" | "admin";

type CandidateRow = {
  id: number;
  candidate_key: string;
  article_key: string;
  source_key: string;
  headline: string;
  slug: string;
  deck: string | null;
  body_markdown: string | null;
  body_text: string | null;
  hero_image_url: string | null;
  city: string | null;
  state: string | null;
  topic_key: string | null;
  category: string;
  canonical_source_url: string;
  source_name: string;
  source_domain: string | null;
  source_hash: string;
  published_source_at: string;
  source_confidence: number;
  normalization_confidence: number;
  review_status: "pending" | "approved" | "rejected" | "needs_review";
  publish_status: "draft" | "ready" | "published" | "archived";
  review_notes: string | null;
  rejection_reason: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  published_by_user_id: string | null;
  published_at: string | null;
  metadata_json: Record<string, unknown> | null;
};

type PublicationRow = {
  id: number;
  candidate_id: number | null;
  slug: string;
  publish_status: "published" | "archived";
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

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers: CORS });
}

function canEdit(role: EditorialRole) {
  return ["editor", "publisher", "admin"].includes(role);
}

function canPublish(role: EditorialRole) {
  return ["publisher", "admin"].includes(role);
}

function definedPatch<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

function toNullableTrimmed(value: unknown) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function mergeMetadata(
  current: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>,
) {
  return {
    ...(current ?? {}),
    ...patch,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  try {
    const token = getBearerToken(req);
    if (!token) {
      return jsonResponse(401, { ok: false, error: "Missing bearer token" });
    }

    const supabase = createServiceClient();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return jsonResponse(401, { ok: false, error: "Unauthorized" });
    }

    const user = authData.user;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").trim().toLowerCase() as EditorialAction;
    const candidateId = Number(body.candidateId);
    const candidateKey = toNullableTrimmed(body.candidateKey);

    if (!["approve", "reject", "publish", "archive"].includes(action)) {
      return jsonResponse(400, { ok: false, error: "Invalid action" });
    }

    const { data: adminRow, error: adminError } = await supabase
      .from("news_editorial_admins")
      .select("user_id, email, role, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (adminError) {
      return jsonResponse(500, { ok: false, error: adminError.message });
    }

    if (!adminRow) {
      return jsonResponse(403, { ok: false, error: "Editorial access denied" });
    }

    const role = adminRow.role as EditorialRole;
    if (!canEdit(role)) {
      return jsonResponse(403, { ok: false, error: "Editorial access denied" });
    }

    let candidateQuery = supabase
      .from("news_article_candidates")
      .select("*");

    if (Number.isFinite(candidateId) && candidateId > 0) {
      candidateQuery = candidateQuery.eq("id", candidateId);
    } else if (candidateKey) {
      candidateQuery = candidateQuery.eq("candidate_key", candidateKey);
    } else {
      return jsonResponse(400, { ok: false, error: "candidateId or candidateKey is required" });
    }

    const { data: candidateData, error: candidateError } = await candidateQuery.single();
    if (candidateError || !candidateData) {
      return jsonResponse(404, { ok: false, error: "Candidate not found" });
    }

    const candidate = candidateData as CandidateRow;
    const now = new Date().toISOString();

    const editorialFields = definedPatch({
      headline: toNullableTrimmed(body.headline) ?? undefined,
      slug: toNullableTrimmed(body.slug) ?? undefined,
      deck: body.deck !== undefined ? toNullableTrimmed(body.deck) : undefined,
      body_markdown: body.bodyMarkdown !== undefined ? toNullableTrimmed(body.bodyMarkdown) : undefined,
      hero_image_url: body.heroImageUrl !== undefined ? toNullableTrimmed(body.heroImageUrl) : undefined,
      city: body.city !== undefined ? toNullableTrimmed(body.city) : undefined,
      state: body.state !== undefined ? toNullableTrimmed(body.state) : undefined,
      review_notes: body.reviewNotes !== undefined ? toNullableTrimmed(body.reviewNotes) : undefined,
    });

    if (action === "reject" && candidate.publish_status === "published") {
      return jsonResponse(409, {
        ok: false,
        error: "Published candidates must be archived instead of rejected",
      });
    }

    if ((action === "publish" || action === "archive") && !canPublish(role)) {
      return jsonResponse(403, { ok: false, error: "Publisher access required" });
    }

    if (action === "reject" && !toNullableTrimmed(body.rejectionReason)) {
      return jsonResponse(400, { ok: false, error: "rejectionReason is required" });
    }

    let candidateUpdate: Record<string, unknown> = {};
    let publicationUpdate: Record<string, unknown> | null = null;
    let archivePublicationId: number | null = null;
    const metadataPatchBase = {
      last_editorial_action: action,
      last_editorial_actor_user_id: user.id,
      last_editorial_actor_email: user.email ?? adminRow.email,
      last_editorial_action_at: now,
    };

    if (action === "approve") {
      candidateUpdate = {
        ...editorialFields,
        review_status: "approved",
        publish_status: candidate.publish_status === "published" ? "published" : "ready",
        rejection_reason: null,
        reviewed_by_user_id: user.id,
        reviewed_at: now,
        metadata_json: mergeMetadata(candidate.metadata_json, metadataPatchBase),
      };
    }

    if (action === "reject") {
      candidateUpdate = {
        ...editorialFields,
        review_status: "rejected",
        publish_status: "draft",
        rejection_reason: toNullableTrimmed(body.rejectionReason),
        reviewed_by_user_id: user.id,
        reviewed_at: now,
        metadata_json: mergeMetadata(candidate.metadata_json, metadataPatchBase),
      };
    }

    if (action === "publish") {
      if (candidate.review_status !== "approved") {
        return jsonResponse(409, { ok: false, error: "Candidate must be approved before publishing" });
      }

      const mergedCandidate = {
        ...candidate,
        ...editorialFields,
      };

      const bodyMarkdown = toNullableTrimmed(mergedCandidate.body_markdown);
      if (!bodyMarkdown) {
        return jsonResponse(400, { ok: false, error: "bodyMarkdown is required before publishing" });
      }

      candidateUpdate = {
        ...editorialFields,
        review_status: "approved",
        publish_status: "published",
        rejection_reason: null,
        reviewed_by_user_id: candidate.reviewed_by_user_id ?? user.id,
        reviewed_at: candidate.reviewed_at ?? now,
        published_by_user_id: user.id,
        published_at: now,
        metadata_json: mergeMetadata(candidate.metadata_json, metadataPatchBase),
      };

      publicationUpdate = {
        candidate_id: candidate.id,
        slug: mergedCandidate.slug,
        headline: mergedCandidate.headline,
        deck: toNullableTrimmed(mergedCandidate.deck),
        body_markdown: bodyMarkdown,
        hero_image_url: toNullableTrimmed(mergedCandidate.hero_image_url),
        city: toNullableTrimmed(mergedCandidate.city),
        state: toNullableTrimmed(mergedCandidate.state),
        topic_key: mergedCandidate.topic_key,
        category: mergedCandidate.category,
        canonical_source_url: mergedCandidate.canonical_source_url,
        source_name: mergedCandidate.source_name,
        source_domain: mergedCandidate.source_domain,
        published_by_user_id: user.id,
        publish_status: "published",
        published_at: now,
        metadata_json: mergeMetadata(candidate.metadata_json, {
          candidate_key: candidate.candidate_key,
          article_key: candidate.article_key,
          source_hash: candidate.source_hash,
          source_confidence: candidate.source_confidence,
          normalization_confidence: candidate.normalization_confidence,
          ...metadataPatchBase,
        }),
      };
    }

    if (action === "archive") {
      if (candidate.publish_status !== "published") {
        return jsonResponse(409, { ok: false, error: "Only published candidates can be archived" });
      }

      const { data: publicationData, error: publicationLookupError } = await supabase
        .from("news_article_publications")
        .select("id")
        .eq("candidate_id", candidate.id)
        .maybeSingle();

      if (publicationLookupError) {
        return jsonResponse(500, { ok: false, error: publicationLookupError.message });
      }

      if (!publicationData) {
        return jsonResponse(404, { ok: false, error: "No publication exists for this candidate" });
      }

      archivePublicationId = Number(publicationData.id) || null;
      candidateUpdate = {
        publish_status: "archived",
        metadata_json: mergeMetadata(candidate.metadata_json, metadataPatchBase),
      };
      publicationUpdate = {
        publish_status: "archived",
        metadata_json: mergeMetadata(candidate.metadata_json, metadataPatchBase),
      };
    }

    let publicationId: number | null = null;

    if (action === "publish" && publicationUpdate) {
      const { data: publicationData, error: publicationError } = await supabase
        .from("news_article_publications")
        .upsert(publicationUpdate, { onConflict: "candidate_id" })
        .select("id, candidate_id, slug, publish_status")
        .single();

      if (publicationError || !publicationData) {
        return jsonResponse(500, { ok: false, error: publicationError?.message || "Publication upsert failed" });
      }

      publicationId = (publicationData as PublicationRow).id;
    }

    if (action === "archive" && publicationUpdate) {
      const { error: publicationUpdateError } = await supabase
        .from("news_article_publications")
        .update(publicationUpdate)
        .eq("id", archivePublicationId);

      if (publicationUpdateError) {
        return jsonResponse(500, { ok: false, error: publicationUpdateError.message });
      }

      publicationId = archivePublicationId;
    }

    const { data: updatedCandidateData, error: updateCandidateError } = await supabase
      .from("news_article_candidates")
      .update(candidateUpdate)
      .eq("id", candidate.id)
      .select("*")
      .single();

    if (updateCandidateError || !updatedCandidateData) {
      if (action === "publish" && publicationId) {
        await supabase
          .from("news_article_publications")
          .delete()
          .eq("id", publicationId);
      }
      if (action === "archive" && publicationId) {
        await supabase
          .from("news_article_publications")
          .update({
            publish_status: "published",
            metadata_json: mergeMetadata(candidate.metadata_json, {
              rollback_from_action: "archive",
              rollback_at: now,
            }),
          })
          .eq("id", publicationId);
      }
      return jsonResponse(500, { ok: false, error: updateCandidateError?.message || "Candidate update failed" });
    }

    const updatedCandidate = updatedCandidateData as CandidateRow;

    return jsonResponse(200, {
      ok: true,
      action,
      candidate: {
        id: updatedCandidate.id,
        candidateKey: updatedCandidate.candidate_key,
        reviewStatus: updatedCandidate.review_status,
        publishStatus: updatedCandidate.publish_status,
        reviewedAt: updatedCandidate.reviewed_at,
        publishedAt: updatedCandidate.published_at,
        slug: updatedCandidate.slug,
      },
      publicationId,
    });
  } catch (error) {
    return jsonResponse(500, { ok: false, error: String(error) });
  }
});
