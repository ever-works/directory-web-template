-- Profile visibility toggle (Upwork-style)
-- Adds an Owner-controlled `public | private` flag on client_profiles.
-- Default 'public' keeps existing profiles reachable; toggling to 'private'
-- hides the public `/client/profile/<username>` page from everyone except
-- the profile owner.
--
-- Additive, idempotent — safe to re-run.

ALTER TABLE "client_profiles"
  ADD COLUMN IF NOT EXISTS "profile_visibility" text DEFAULT 'public' NOT NULL;
