
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

  -- Wrap everything in exception handler so push failures NEVER block order creation
  BEGIN

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

  EXCEPTION WHEN OTHERS THEN
    -- Log the error but NEVER block the order
    RAISE WARNING 'Push notification failed: %', SQLERRM;
    BEGIN
      INSERT INTO public.push_log(user_id, type, payload, status)
      VALUES (NULL, 'error', jsonb_build_object('error', SQLERRM, 'order_id', NEW.id::text), 'failed');
    EXCEPTION WHEN OTHERS THEN
      -- Even logging failed, just continue silently
      NULL;
    END;
  END;

  RETURN NEW;
END;
$function$;
