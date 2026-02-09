-- =============================================
-- PUSH NOTIFICATIONS TRIGGERS
-- Send enriched push notifications via Edge Function
-- =============================================

-- Helper function to get user push tokens
CREATE OR REPLACE FUNCTION get_user_push_tokens(target_user_id UUID)
RETURNS TABLE (token TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT upt.token
  FROM public.user_push_tokens upt
  WHERE upt.user_id = target_user_id
    AND upt.is_enabled = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper function to get admin and supervisor user IDs
CREATE OR REPLACE FUNCTION get_admin_supervisor_ids()
RETURNS TABLE (user_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ur.user_id
  FROM public.user_roles ur
  WHERE ur.role IN ('administrateur', 'superviseur');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- TRIGGER 1: New Order Inserts
-- Notify admins and supervisors
-- =============================================
CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS TRIGGER AS $$
DECLARE
  admin_user_id UUID;
  client_name TEXT;
  product_name TEXT;
  push_payload JSONB;
  edge_function_url TEXT;
BEGIN
  -- Get enriched data
  SELECT c.full_name INTO client_name
  FROM public.clients c
  WHERE c.id = NEW.client_id;

  SELECT p.name INTO product_name
  FROM public.products p
  WHERE p.id = NEW.product_id;

  -- Build push notification URL (replace PROJECT_REF with actual value or use env var)
  edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push-notification';
  
  -- For each admin/supervisor, send push notification
  FOR admin_user_id IN
    SELECT * FROM get_admin_supervisor_ids()
  LOOP
    -- Build payload with enriched context
    push_payload := jsonb_build_object(
      'user_id', admin_user_id,
      'title', '🆕 Nouvelle commande',
      'body', format('Commande %s - %s (%s) - %s DH',
        COALESCE(NEW.order_number, 'N/A'),
        COALESCE(client_name, 'Client'),
        COALESCE(product_name, 'Produit'),
        NEW.total_amount
      ),
      'data', jsonb_build_object(
        'type', 'new_order',
        'order_id', NEW.id,
        'order_number', NEW.order_number,
        'client_name', client_name,
        'product_name', product_name,
        'total_amount', NEW.total_amount,
        'delivery_address', NEW.delivery_address
      )
    );

    -- Send HTTP POST to Edge Function
    PERFORM net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := push_payload
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, net;

CREATE TRIGGER trigger_notify_new_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION notify_new_order();

-- =============================================
-- TRIGGER 2: Order Assignment to Caller
-- Via assigned_to column
-- =============================================
CREATE OR REPLACE FUNCTION notify_order_assigned_to_caller()
RETURNS TRIGGER AS $$
DECLARE
  client_name TEXT;
  product_name TEXT;
  push_payload JSONB;
  edge_function_url TEXT;
BEGIN
  -- Only trigger if assigned_to changed and is not null
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    -- Get enriched data
    SELECT c.full_name INTO client_name
    FROM public.clients c
    WHERE c.id = NEW.client_id;

    SELECT p.name INTO product_name
    FROM public.products p
    WHERE p.id = NEW.product_id;

    edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push-notification';

    -- Build payload
    push_payload := jsonb_build_object(
      'user_id', NEW.assigned_to,
      'title', '📋 Commande assignée',
      'body', format('Commande %s - %s (%s) - %s DH',
        COALESCE(NEW.order_number, 'N/A'),
        COALESCE(client_name, 'Client'),
        COALESCE(product_name, 'Produit'),
        NEW.total_amount
      ),
      'data', jsonb_build_object(
        'type', 'order_assigned',
        'order_id', NEW.id,
        'order_number', NEW.order_number,
        'client_name', client_name,
        'product_name', product_name,
        'total_amount', NEW.total_amount,
        'delivery_address', NEW.delivery_address
      )
    );

    -- Send notification
    PERFORM net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := push_payload
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, net;

CREATE TRIGGER trigger_notify_order_assigned_to_caller
AFTER INSERT OR UPDATE OF assigned_to ON public.orders
FOR EACH ROW
EXECUTE FUNCTION notify_order_assigned_to_caller();

-- =============================================
-- TRIGGER 3: Order Assignment to Delivery Person
-- Via delivery_person_id (resolve to user_id)
-- =============================================
CREATE OR REPLACE FUNCTION notify_order_assigned_to_delivery()
RETURNS TRIGGER AS $$
DECLARE
  delivery_user_id UUID;
  client_name TEXT;
  product_name TEXT;
  push_payload JSONB;
  edge_function_url TEXT;
BEGIN
  -- Only trigger if delivery_person_id changed and is not null
  IF NEW.delivery_person_id IS NOT NULL AND (OLD.delivery_person_id IS NULL OR OLD.delivery_person_id != NEW.delivery_person_id) THEN
    -- Get delivery person's user_id
    SELECT dp.user_id INTO delivery_user_id
    FROM public.delivery_persons dp
    WHERE dp.id = NEW.delivery_person_id;

    IF delivery_user_id IS NOT NULL THEN
      -- Get enriched data
      SELECT c.full_name INTO client_name
      FROM public.clients c
      WHERE c.id = NEW.client_id;

      SELECT p.name INTO product_name
      FROM public.products p
      WHERE p.id = NEW.product_id;

      edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push-notification';

      -- Build payload
      push_payload := jsonb_build_object(
        'user_id', delivery_user_id,
        'title', '🚚 Nouvelle livraison',
        'body', format('Commande %s - %s (%s) - %s DH à livrer',
          COALESCE(NEW.order_number, 'N/A'),
          COALESCE(client_name, 'Client'),
          COALESCE(product_name, 'Produit'),
          NEW.total_amount
        ),
        'data', jsonb_build_object(
          'type', 'delivery_assigned',
          'order_id', NEW.id,
          'order_number', NEW.order_number,
          'client_name', client_name,
          'product_name', product_name,
          'total_amount', NEW.total_amount,
          'delivery_address', NEW.delivery_address
        )
      );

      -- Send notification
      PERFORM net.http_post(
        url := edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        body := push_payload
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, net;

CREATE TRIGGER trigger_notify_order_assigned_to_delivery
AFTER INSERT OR UPDATE OF delivery_person_id ON public.orders
FOR EACH ROW
EXECUTE FUNCTION notify_order_assigned_to_delivery();

-- =============================================
-- TRIGGER 4: 1-to-1 Chat Messages
-- Via receiver_id
-- =============================================
CREATE OR REPLACE FUNCTION notify_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  push_payload JSONB;
  edge_function_url TEXT;
BEGIN
  -- Only send push for 1-to-1 messages (receiver_id is not null)
  IF NEW.receiver_id IS NOT NULL THEN
    -- Get sender name
    SELECT p.full_name INTO sender_name
    FROM public.profiles p
    WHERE p.id = NEW.sender_id;

    edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push-notification';

    -- Build payload
    push_payload := jsonb_build_object(
      'user_id', NEW.receiver_id,
      'title', format('💬 Message de %s', COALESCE(sender_name, 'Utilisateur')),
      'body', substring(NEW.content, 1, 100),
      'data', jsonb_build_object(
        'type', 'chat_message',
        'message_id', NEW.id,
        'sender_id', NEW.sender_id,
        'sender_name', sender_name,
        'channel', NEW.channel,
        'order_id', NEW.order_id
      )
    );

    -- Send notification
    PERFORM net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := push_payload
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, net;

CREATE TRIGGER trigger_notify_chat_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION notify_chat_message();
