
-- Function to auto-cancel reported orders that remain unchanged 24h after their deadline
CREATE OR REPLACE FUNCTION public.auto_cancel_stale_reported_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cancelled_count integer;
BEGIN
  UPDATE public.orders
  SET 
    status = 'cancelled',
    cancellation_reason = 'Annulation automatique - Commande reportée non traitée après 24h',
    updated_at = now()
  WHERE status = 'reported'
    AND (
      -- 24h after scheduled_at (deadline) if set
      (scheduled_at IS NOT NULL AND scheduled_at + interval '24 hours' < now())
      OR
      -- 24h after last update if no scheduled_at
      (scheduled_at IS NULL AND updated_at + interval '24 hours' < now())
    );
  
  GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  RETURN cancelled_count;
END;
$$;
