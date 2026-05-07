
-- 1. Remove JWT-claim-based admin policies (privilege escalation risk)
DROP POLICY IF EXISTS admin_all_user_roles ON public.user_roles;
DROP POLICY IF EXISTS admin_all_role_requests ON public.role_requests;
DROP POLICY IF EXISTS admin_read_role_requests ON public.role_requests;
DROP POLICY IF EXISTS admin_update_role_requests ON public.role_requests;
DROP POLICY IF EXISTS admin_delete_role_requests ON public.role_requests;

-- 2. Remove overly broad avatars SELECT policy (any authed user could read all avatars)
DROP POLICY IF EXISTS "Authenticated users can view avatars" ON storage.objects;

-- 3. Lock down manychat_subscribers reads to admins/supervisors
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='manychat_subscribers') THEN
    EXECUTE 'ALTER TABLE public.manychat_subscribers ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS manychat_subscribers_admin_select ON public.manychat_subscribers';
    EXECUTE $p$CREATE POLICY manychat_subscribers_admin_select ON public.manychat_subscribers
      FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'administrateur') OR public.has_role(auth.uid(), 'superviseur'))$p$;
  END IF;
END $$;

-- 4. Harden can_chat() to require confirmed roles
CREATE OR REPLACE FUNCTION public.can_chat(sender_id uuid, receiver_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sender_role app_role;
  receiver_role app_role;
BEGIN
  SELECT role INTO sender_role
  FROM public.user_roles
  WHERE user_id = sender_id AND confirmed = true
  LIMIT 1;

  SELECT role INTO receiver_role
  FROM public.user_roles
  WHERE user_id = receiver_id AND confirmed = true
  LIMIT 1;

  IF sender_role IS NULL OR receiver_role IS NULL THEN
    RETURN false;
  END IF;

  IF (sender_role = 'appelant' AND receiver_role = 'superviseur') OR
     (sender_role = 'superviseur' AND receiver_role = 'appelant') OR
     (sender_role = 'livreur' AND receiver_role = 'superviseur') OR
     (sender_role = 'superviseur' AND receiver_role = 'livreur') OR
     (sender_role = 'administrateur' AND receiver_role = 'superviseur') OR
     (sender_role = 'superviseur' AND receiver_role = 'administrateur') THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;
