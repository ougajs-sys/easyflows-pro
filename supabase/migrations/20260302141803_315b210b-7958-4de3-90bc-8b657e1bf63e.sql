
-- 1. Create work_notification_logs table
CREATE TABLE IF NOT EXISTS public.work_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  recipient_user_id UUID,
  recipient_phone TEXT,
  message TEXT,
  link TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  provider TEXT DEFAULT 'messenger360',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS
ALTER TABLE public.work_notification_logs ENABLE ROW LEVEL SECURITY;

-- Service role can insert (triggers call via service role)
CREATE POLICY "Service role can insert logs"
  ON public.work_notification_logs
  FOR INSERT
  WITH CHECK (true);

-- Users can see their own logs
CREATE POLICY "Users can view own logs"
  ON public.work_notification_logs
  FOR SELECT
  USING (recipient_user_id = auth.uid());

-- Admins/supervisors can view all logs
CREATE POLICY "Admins and supervisors can view all logs"
  ON public.work_notification_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('administrateur', 'superviseur')
        AND ur.confirmed = true
    )
  );

-- 3. Index for deduplication queries
CREATE INDEX idx_work_notif_dedup 
  ON public.work_notification_logs (event_type, recipient_user_id, created_at DESC);

-- 4. Modify orders_push_notify() to also call send-work-notification
CREATE OR REPLACE FUNCTION public.orders_push_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  push_url text := 'https://qpxzuglvvfvookzmpgfe.supabase.co/functions/v1/send-push-notification';
  work_url text := 'https://qpxzuglvvfvookzmpgfe.supabase.co/functions/v1/send-work-notification';
  payload jsonb;
  work_payload jsonb;
  resp jsonb;
  v_order_number text;
  v_client_name text;
  v_target_user_ids jsonb;
BEGIN
  v_order_number := COALESCE(NEW.order_number, 'N/A');
  
  SELECT c.full_name INTO v_client_name 
  FROM public.clients c WHERE c.id = NEW.client_id;
  v_client_name := COALESCE(v_client_name, 'Client');

  BEGIN

    -- CASE 1: New order -> notify admins and supervisors
    IF TG_OP = 'INSERT' THEN
      SELECT jsonb_agg(ur.user_id::text)
      INTO v_target_user_ids
      FROM public.user_roles ur
      WHERE ur.role IN ('administrateur', 'superviseur')
        AND ur.confirmed = true
        AND ur.user_id != COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid);

      IF v_target_user_ids IS NOT NULL AND jsonb_array_length(v_target_user_ids) > 0 THEN
        -- Push notification
        payload := jsonb_build_object(
          'user_ids', v_target_user_ids,
          'title', 'Nouvelle commande ' || v_order_number,
          'body', 'Commande de ' || v_client_name || ' - ' || NEW.total_amount || ' DA',
          'data', jsonb_build_object('type', 'new_order', 'order_id', NEW.id::text, 'link', '/orders')
        );
        resp := public.http_post_with_service_role(push_url, payload);
        INSERT INTO public.push_log(user_id, type, payload, status)
        VALUES (NULL, 'new_order', payload, COALESCE(resp->>'status','sent'));

        -- WhatsApp notification
        work_payload := jsonb_build_object(
          'event_type', 'new_order',
          'title', 'EasyFlows: Nouvelle commande ' || v_order_number,
          'body', 'Client: ' || v_client_name || ' - ' || NEW.total_amount || ' FCFA',
          'target_user_ids', v_target_user_ids,
          'link', '/orders'
        );
        PERFORM public.http_post_with_service_role(work_url, work_payload);
      END IF;
    END IF;

    -- CASE 2: Delivery person assigned
    IF TG_OP = 'UPDATE' AND NEW.delivery_person_id IS DISTINCT FROM OLD.delivery_person_id AND NEW.delivery_person_id IS NOT NULL THEN
      DECLARE
        v_dp_user_id text;
      BEGIN
        SELECT dp.user_id::text INTO v_dp_user_id
        FROM public.delivery_persons dp
        WHERE dp.id = NEW.delivery_person_id;

        IF v_dp_user_id IS NOT NULL THEN
          -- Push
          payload := jsonb_build_object(
            'user_ids', jsonb_build_array(v_dp_user_id),
            'title', 'Commande assignée ' || v_order_number,
            'body', 'Livraison pour ' || v_client_name || ' - ' || COALESCE(NEW.delivery_address, 'Adresse non précisée'),
            'data', jsonb_build_object('type', 'order_assigned_delivery', 'order_id', NEW.id::text, 'link', '/delivery')
          );
          resp := public.http_post_with_service_role(push_url, payload);
          INSERT INTO public.push_log(user_id, type, payload, status)
          VALUES (v_dp_user_id::uuid, 'order_assigned_delivery', payload, COALESCE(resp->>'status','sent'));

          -- WhatsApp
          work_payload := jsonb_build_object(
            'event_type', 'order_assigned_delivery',
            'title', 'EasyFlows: Livraison assignée ' || v_order_number,
            'body', 'Client: ' || v_client_name || chr(10) || 'Adresse: ' || COALESCE(NEW.delivery_address, 'Non précisée'),
            'target_user_ids', jsonb_build_array(v_dp_user_id),
            'link', '/delivery'
          );
          PERFORM public.http_post_with_service_role(work_url, work_payload);
        END IF;
      END;
    END IF;

    -- CASE 3: Order assigned to caller
    IF TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
      -- Push
      payload := jsonb_build_object(
        'user_ids', jsonb_build_array(NEW.assigned_to::text),
        'title', 'Commande assignée ' || v_order_number,
        'body', 'Suivi client: ' || v_client_name,
        'data', jsonb_build_object('type', 'order_assigned_caller', 'order_id', NEW.id::text, 'link', '/caller')
      );
      resp := public.http_post_with_service_role(push_url, payload);
      INSERT INTO public.push_log(user_id, type, payload, status)
      VALUES (NEW.assigned_to, 'order_assigned_caller', payload, COALESCE(resp->>'status','sent'));

      -- WhatsApp
      work_payload := jsonb_build_object(
        'event_type', 'order_assigned_caller',
        'title', 'EasyFlows: Commande assignée ' || v_order_number,
        'body', 'Client: ' || v_client_name,
        'target_user_ids', jsonb_build_array(NEW.assigned_to::text),
        'link', '/caller'
      );
      PERFORM public.http_post_with_service_role(work_url, work_payload);
    END IF;

    -- CASE 4: Status change -> notify creator + admins
    IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
      DECLARE
        v_status_targets jsonb;
      BEGIN
        SELECT jsonb_agg(DISTINCT uid::text)
        INTO v_status_targets
        FROM (
          -- Order creator
          SELECT NEW.created_by AS uid WHERE NEW.created_by IS NOT NULL
          UNION
          -- Admins
          SELECT ur.user_id AS uid FROM public.user_roles ur
          WHERE ur.role = 'administrateur' AND ur.confirmed = true
        ) sub
        WHERE uid IS NOT NULL;

        IF v_status_targets IS NOT NULL AND jsonb_array_length(v_status_targets) > 0 THEN
          work_payload := jsonb_build_object(
            'event_type', 'order_status_changed',
            'title', 'EasyFlows: ' || v_order_number || ' - Statut modifié',
            'body', OLD.status || ' → ' || NEW.status || chr(10) || 'Client: ' || v_client_name,
            'target_user_ids', v_status_targets,
            'link', '/orders'
          );
          PERFORM public.http_post_with_service_role(work_url, work_payload);
        END IF;
      END;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Push/WhatsApp notification failed: %', SQLERRM;
    BEGIN
      INSERT INTO public.push_log(user_id, type, payload, status)
      VALUES (NULL, 'error', jsonb_build_object('error', SQLERRM, 'order_id', NEW.id::text), 'failed');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  RETURN NEW;
END;
$function$;

-- 5. Modify messages_push_notify() to also send WhatsApp for DMs
CREATE OR REPLACE FUNCTION public.messages_push_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  push_url text := 'https://qpxzuglvvfvookzmpgfe.supabase.co/functions/v1/send-push-notification';
  work_url text := 'https://qpxzuglvvfvookzmpgfe.supabase.co/functions/v1/send-work-notification';
  payload jsonb;
  work_payload jsonb;
  resp jsonb;
  v_sender_name text;
BEGIN
  IF NEW.is_read IS TRUE THEN RETURN NEW; END IF;
  IF NEW.receiver_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.room_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.sender_id = NEW.receiver_id THEN RETURN NEW; END IF;

  -- Get sender name
  SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  v_sender_name := COALESCE(v_sender_name, 'Quelqu''un');

  BEGIN
    -- Push notification
    payload := jsonb_build_object(
      'user_ids', jsonb_build_array(NEW.receiver_id::text),
      'title', 'Nouveau message',
      'body', COALESCE(substr(NEW.content, 1, 120), 'Message'),
      'data', jsonb_build_object('type', 'message', 'message_id', NEW.id::text, 'sender_id', NEW.sender_id::text, 'link', '/chat')
    );
    resp := public.http_post_with_service_role(push_url, payload);
    INSERT INTO public.push_log(user_id, type, payload, status)
    VALUES (NEW.receiver_id, 'message_created', payload, COALESCE(resp->>'status','sent'));

    -- WhatsApp notification
    work_payload := jsonb_build_object(
      'event_type', 'new_message',
      'title', 'EasyFlows: Nouveau message de ' || v_sender_name,
      'body', COALESCE(substr(NEW.content, 1, 100), 'Message reçu'),
      'target_user_ids', jsonb_build_array(NEW.receiver_id::text),
      'link', '/chat'
    );
    PERFORM public.http_post_with_service_role(work_url, work_payload);

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Message notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

-- 6. Trigger for revenue_deposits -> notify supervisors/admins
CREATE OR REPLACE FUNCTION public.deposits_work_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  work_url text := 'https://qpxzuglvvfvookzmpgfe.supabase.co/functions/v1/send-work-notification';
  work_payload jsonb;
  v_target_user_ids jsonb;
  v_depositor_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get depositor name
    SELECT full_name INTO v_depositor_name FROM public.profiles WHERE id = NEW.deposited_by;
    v_depositor_name := COALESCE(v_depositor_name, 'Un membre');

    -- Get supervisors + admins (excluding depositor)
    SELECT jsonb_agg(ur.user_id::text)
    INTO v_target_user_ids
    FROM public.user_roles ur
    WHERE ur.role IN ('administrateur', 'superviseur')
      AND ur.confirmed = true
      AND ur.user_id != NEW.deposited_by;

    IF v_target_user_ids IS NOT NULL AND jsonb_array_length(v_target_user_ids) > 0 THEN
      work_payload := jsonb_build_object(
        'event_type', 'new_deposit',
        'title', 'EasyFlows: Versement en attente',
        'body', v_depositor_name || ' a versé ' || NEW.total_amount || ' FCFA (' || NEW.revenues_count || ' recettes)',
        'target_user_ids', v_target_user_ids,
        'link', '/supervisor'
      );
      PERFORM public.http_post_with_service_role(work_url, work_payload);
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Deposit WhatsApp notification failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER deposits_work_notify_trigger
  AFTER INSERT ON public.revenue_deposits
  FOR EACH ROW EXECUTE FUNCTION public.deposits_work_notify();
