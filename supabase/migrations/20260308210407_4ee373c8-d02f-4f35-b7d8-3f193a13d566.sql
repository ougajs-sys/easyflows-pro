
-- Trigger: auto-create follow_up when order becomes reported or partial
CREATE OR REPLACE FUNCTION public.auto_create_followup_on_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when status changes TO reported or partial
  IF (NEW.status IN ('reported', 'partial')) 
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    
    -- Check no pending/awaiting follow-up already exists for this order
    IF NOT EXISTS (
      SELECT 1 FROM public.follow_ups
      WHERE order_id = NEW.id
        AND status IN ('pending', 'awaiting_validation')
    ) THEN
      INSERT INTO public.follow_ups (
        client_id,
        order_id,
        type,
        status,
        scheduled_at,
        created_by,
        notes
      ) VALUES (
        NEW.client_id,
        NEW.id,
        CASE 
          WHEN NEW.status = 'partial' THEN 'partial_payment'::followup_type
          ELSE 'rescheduled'::followup_type
        END,
        'awaiting_validation'::followup_status,
        COALESCE(NEW.scheduled_at, now() + interval '24 hours'),
        NEW.created_by,
        CASE
          WHEN NEW.status = 'partial' THEN 'Relance auto - Paiement partiel ' || COALESCE(NEW.order_number, '')
          ELSE 'Relance auto - Commande reportée ' || COALESCE(NEW.order_number, '') || COALESCE(' - ' || NEW.report_reason, '')
        END
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trg_auto_create_followup ON public.orders;
CREATE TRIGGER trg_auto_create_followup
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_followup_on_order_status();
