-- Corriger la fonction approve_role_request qui utilise la mauvaise colonne
CREATE OR REPLACE FUNCTION public.approve_role_request(p_request_id uuid, p_reviewer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Marquer la demande comme approuvée
  UPDATE public.role_requests
    SET status = 'approved', reviewed_by = p_reviewer_id, reviewed_at = now()
  WHERE id = p_request_id;

  -- Insérer/valider le rôle dans user_roles (utiliser requested_role, pas role)
  INSERT INTO public.user_roles (user_id, role, confirmed, confirmed_at)
  SELECT rr.user_id, rr.requested_role, true, now()
  FROM public.role_requests rr
  WHERE rr.id = p_request_id
  ON CONFLICT (user_id, role) DO UPDATE SET confirmed = EXCLUDED.confirmed, confirmed_at = EXCLUDED.confirmed_at;
END;
$function$;