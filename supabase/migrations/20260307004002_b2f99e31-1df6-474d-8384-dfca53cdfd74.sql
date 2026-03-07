CREATE OR REPLACE FUNCTION public.apply_role_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Only when moving to approved
  IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.user_roles (user_id, role, confirmed, confirmed_at)
    VALUES (NEW.user_id, NEW.requested_role, true, now())
    ON CONFLICT (user_id, role) DO UPDATE
      SET confirmed = true,
          confirmed_at = now();
  END IF;

  -- When rejected, mark as unconfirmed if exists
  IF TG_OP = 'UPDATE' AND NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    UPDATE public.user_roles
      SET confirmed = false,
          confirmed_at = NULL
    WHERE user_id = NEW.user_id
      AND role = NEW.requested_role;
  END IF;

  RETURN NEW;
END;
$$;