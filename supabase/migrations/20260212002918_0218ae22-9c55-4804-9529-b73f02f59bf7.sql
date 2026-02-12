
-- ========================================
-- 1. Fix messages_push_notify to use correct URL and payload format
-- ========================================
CREATE OR REPLACE FUNCTION public.messages_push_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  edge_url text := 'https://qpxzuglvvfvookzmpgfe.supabase.co/functions/v1/send-push-notification';
  payload jsonb;
  resp jsonb;
BEGIN
  -- Skip read messages, room messages, and self-messages
  IF NEW.is_read IS TRUE THEN RETURN NEW; END IF;
  IF NEW.receiver_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.room_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.sender_id = NEW.receiver_id THEN RETURN NEW; END IF;

  -- Build payload for send-push-notification edge function
  payload := jsonb_build_object(
    'user_ids', jsonb_build_array(NEW.receiver_id::text),
    'title', 'Nouveau message',
    'body', COALESCE(substr(NEW.content, 1, 120), 'Message'),
    'data', jsonb_build_object(
      'type', 'message',
      'message_id', NEW.id::text,
      'sender_id', NEW.sender_id::text,
      'link', '/chat'
    )
  );

  -- Call Edge Function
  resp := public.http_post_with_service_role(edge_url, payload);

  -- Log
  INSERT INTO public.push_log(user_id, type, payload, status)
  VALUES (NEW.receiver_id, 'message_created', payload, COALESCE(resp->>'status','sent'));

  RETURN NEW;
END;
$function$;

-- ========================================
-- 2. Create push notification function for orders
-- ========================================
CREATE OR REPLACE FUNCTION public.orders_push_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  edge_url text := 'https://qpxzuglvvfvookzmpgfe.supabase.co/functions/v1/send-push-notification';
  payload jsonb;
  resp jsonb;
  v_order_number text;
  v_client_name text;
  v_target_user_ids jsonb;
BEGIN
  -- Get order details
  v_order_number := COALESCE(NEW.order_number, 'N/A');
  
  SELECT c.full_name INTO v_client_name 
  FROM public.clients c WHERE c.id = NEW.client_id;
  v_client_name := COALESCE(v_client_name, 'Client');

  -- CASE 1: New order created -> notify admins and supervisors
  IF TG_OP = 'INSERT' THEN
    SELECT jsonb_agg(ur.user_id::text)
    INTO v_target_user_ids
    FROM public.user_roles ur
    WHERE ur.role IN ('administrateur', 'superviseur')
      AND ur.confirmed = true
      AND ur.user_id != COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid);

    IF v_target_user_ids IS NOT NULL AND jsonb_array_length(v_target_user_ids) > 0 THEN
      payload := jsonb_build_object(
        'user_ids', v_target_user_ids,
        'title', 'Nouvelle commande ' || v_order_number,
        'body', 'Commande de ' || v_client_name || ' - ' || NEW.total_amount || ' DA',
        'data', jsonb_build_object(
          'type', 'new_order',
          'order_id', NEW.id::text,
          'link', '/orders'
        )
      );
      resp := public.http_post_with_service_role(edge_url, payload);
      
      INSERT INTO public.push_log(user_id, type, payload, status)
      VALUES (NULL, 'new_order', payload, COALESCE(resp->>'status','sent'));
    END IF;
  END IF;

  -- CASE 2: Delivery person assigned -> notify them
  IF TG_OP = 'UPDATE' AND NEW.delivery_person_id IS DISTINCT FROM OLD.delivery_person_id AND NEW.delivery_person_id IS NOT NULL THEN
    -- Get user_id from delivery_persons table
    SELECT dp.user_id::text INTO v_target_user_ids
    FROM public.delivery_persons dp
    WHERE dp.id = NEW.delivery_person_id;

    IF v_target_user_ids IS NOT NULL THEN
      payload := jsonb_build_object(
        'user_ids', jsonb_build_array(v_target_user_ids),
        'title', 'Commande assignée ' || v_order_number,
        'body', 'Livraison pour ' || v_client_name || ' - ' || COALESCE(NEW.delivery_address, 'Adresse non précisée'),
        'data', jsonb_build_object(
          'type', 'order_assigned_delivery',
          'order_id', NEW.id::text,
          'link', '/delivery'
        )
      );
      resp := public.http_post_with_service_role(edge_url, payload);
      
      INSERT INTO public.push_log(user_id, type, payload, status)
      VALUES (v_target_user_ids::uuid, 'order_assigned_delivery', payload, COALESCE(resp->>'status','sent'));
    END IF;
  END IF;

  -- CASE 3: Order assigned to caller -> notify them
  IF TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    payload := jsonb_build_object(
      'user_ids', jsonb_build_array(NEW.assigned_to::text),
      'title', 'Commande assignée ' || v_order_number,
      'body', 'Suivi client: ' || v_client_name,
      'data', jsonb_build_object(
        'type', 'order_assigned_caller',
        'order_id', NEW.id::text,
        'link', '/caller'
      )
    );
    resp := public.http_post_with_service_role(edge_url, payload);
    
    INSERT INTO public.push_log(user_id, type, payload, status)
    VALUES (NEW.assigned_to, 'order_assigned_caller', payload, COALESCE(resp->>'status','sent'));
  END IF;

  RETURN NEW;
END;
$function$;

-- ========================================
-- 3. Create trigger on orders table
-- ========================================
DROP TRIGGER IF EXISTS trg_orders_push_notify_insert ON public.orders;
DROP TRIGGER IF EXISTS trg_orders_push_notify_update ON public.orders;

CREATE TRIGGER trg_orders_push_notify_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.orders_push_notify();

CREATE TRIGGER trg_orders_push_notify_update
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.orders_push_notify();
