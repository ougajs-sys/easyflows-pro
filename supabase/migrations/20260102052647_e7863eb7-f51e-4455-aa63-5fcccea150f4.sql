-- Add explicit activation/confirmation tracking to roles
ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS confirmed boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone;

-- Backfill: mark existing users as confirmed so current access isn't broken
UPDATE public.user_roles
SET confirmed = true,
    confirmed_at = COALESCE(confirmed_at, now())
WHERE confirmed = false;