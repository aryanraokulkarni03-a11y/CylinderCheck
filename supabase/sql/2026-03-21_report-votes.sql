-- ============================================
-- CylinderCheck - Report votes
-- Signed-in users can upvote a report once.
-- The report_votes table is the source of truth,
-- while reports.votes remains the cached display count.
-- Existing reports.votes history is preserved via vote_baseline.
-- ============================================

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS vote_baseline INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.report_votes (
  id         BIGSERIAL PRIMARY KEY,
  report_id  BIGINT NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.report_votes
  ADD COLUMN IF NOT EXISTS report_id BIGINT,
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'report_votes_report_id_fkey'
  ) THEN
    ALTER TABLE public.report_votes
      ADD CONSTRAINT report_votes_report_id_fkey
      FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS report_votes_report_user_uidx
  ON public.report_votes (report_id, user_id);

CREATE INDEX IF NOT EXISTS report_votes_user_id_idx
  ON public.report_votes (user_id);

CREATE INDEX IF NOT EXISTS report_votes_report_id_idx
  ON public.report_votes (report_id);

CREATE OR REPLACE FUNCTION public.refresh_report_vote_total(p_report_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.reports
  SET votes = (
    COALESCE(vote_baseline, 0)
    +
    (
      SELECT COUNT(*)
      FROM public.report_votes rv
      WHERE rv.report_id = p_report_id
    )
  )
  WHERE id = p_report_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_report_vote_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_report_vote_total(OLD.report_id);
    RETURN OLD;
  END IF;

  PERFORM public.refresh_report_vote_total(NEW.report_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS report_votes_refresh_after_insert
  ON public.report_votes;

CREATE TRIGGER report_votes_refresh_after_insert
  AFTER INSERT ON public.report_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_report_vote_change();

DROP TRIGGER IF EXISTS report_votes_refresh_after_delete
  ON public.report_votes;

CREATE TRIGGER report_votes_refresh_after_delete
  AFTER DELETE ON public.report_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_report_vote_change();

ALTER TABLE public.report_votes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'report_votes'
      AND policyname = 'Authenticated users can read own report votes'
  ) THEN
    CREATE POLICY "Authenticated users can read own report votes"
      ON public.report_votes
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'report_votes'
      AND policyname = 'Authenticated users can insert own report votes'
  ) THEN
    CREATE POLICY "Authenticated users can insert own report votes"
      ON public.report_votes
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

WITH vote_totals AS (
  SELECT
    rv.report_id,
    COUNT(*)::INT AS vote_count
  FROM public.report_votes rv
  GROUP BY rv.report_id
)
UPDATE public.reports r
SET
  vote_baseline = GREATEST(COALESCE(r.votes, 0) - COALESCE(vt.vote_count, 0), 0),
  votes = COALESCE(r.votes, 0)
FROM vote_totals vt
WHERE r.id = vt.report_id;

UPDATE public.reports
SET
  vote_baseline = COALESCE(votes, 0),
  votes = COALESCE(votes, 0)
WHERE vote_baseline = 0
  AND id NOT IN (
    SELECT DISTINCT report_id
    FROM public.report_votes
  );
