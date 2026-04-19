import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const DEFAULT_ROBOTS_DIRECTIVE = "noindex, nofollow, noarchive";

type LifecycleState = "active" | "dormant";

type ProjectRuntimeStateRow = {
  state_key: string;
  lifecycle_state: LifecycleState;
  public_notice_title: string | null;
  public_notice_body: string | null;
  public_notice_signature: string | null;
  robots_directive: string | null;
  block_all_requests: boolean;
};

export type ProjectRuntimeState = {
  stateKey: string;
  lifecycleState: LifecycleState;
  publicNoticeTitle: string;
  publicNoticeBody: string;
  publicNoticeSignature: string;
  robotsDirective: string;
  blockAllRequests: boolean;
};

type GuardOptions = {
  supabase: SupabaseClient;
  functionName: string;
  baseHeaders?: Record<string, string>;
  methodNotAllowed?: boolean;
};

function normalizeState(row: Partial<ProjectRuntimeStateRow> | null | undefined): ProjectRuntimeState {
  return {
    stateKey: String(row?.state_key ?? "primary"),
    lifecycleState: row?.lifecycle_state === "active" ? "active" : "dormant",
    publicNoticeTitle: String(row?.public_notice_title ?? "CylinderCheck has been discontinued"),
    publicNoticeBody: String(
      row?.public_notice_body ??
        "This project has been shut down by Team Xisch and is no longer operating.",
    ),
    publicNoticeSignature: String(row?.public_notice_signature ?? "Team Xisch"),
    robotsDirective: String(row?.robots_directive ?? DEFAULT_ROBOTS_DIRECTIVE),
    blockAllRequests: row?.block_all_requests !== false,
  };
}

export function buildDormantHeaders(baseHeaders: Record<string, string> = {}, robotsDirective = DEFAULT_ROBOTS_DIRECTIVE) {
  return {
    ...baseHeaders,
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Robots-Tag": robotsDirective || DEFAULT_ROBOTS_DIRECTIVE,
  };
}

export async function readProjectRuntimeState(supabase: SupabaseClient) {
  try {
    const { data, error } = await supabase
      .from("project_runtime_state")
      .select("state_key, lifecycle_state, public_notice_title, public_notice_body, public_notice_signature, robots_directive, block_all_requests")
      .eq("state_key", "primary")
      .maybeSingle();

    if (error) {
      return normalizeState(null);
    }

    return normalizeState(data ?? null);
  } catch {
    // Fail closed for sunset mode.
    return normalizeState(null);
  }
}

export function buildDormantResponse(
  state: ProjectRuntimeState,
  functionName: string,
  baseHeaders: Record<string, string> = {},
) {
  return new Response(
    JSON.stringify({
      ok: false,
      error: "Project discontinued",
      lifecycleState: state.lifecycleState,
      functionName,
      messageTitle: state.publicNoticeTitle,
      messageBody: state.publicNoticeBody,
      signature: state.publicNoticeSignature,
    }),
    {
      status: 503,
      headers: buildDormantHeaders(baseHeaders, state.robotsDirective),
    },
  );
}

export async function requireProjectActive(options: GuardOptions) {
  const state = await readProjectRuntimeState(options.supabase);
  if (state.lifecycleState !== "active" || state.blockAllRequests) {
    return {
      ok: false as const,
      response: buildDormantResponse(state, options.functionName, options.baseHeaders),
      state,
    };
  }

  return {
    ok: true as const,
    state,
  };
}
