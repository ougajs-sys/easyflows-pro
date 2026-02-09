-- =============================================
-- PWA PUSH NOTIFICATIONS SYSTEM (FCM HTTP v1)
-- =============================================

-- =============================================
-- 1. ENABLE PG_NET EXTENSION
-- =============================================
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =============================================
-- 2. USER PUSH TOKENS TABLE
-- =============================================
CREATE TABLE public.user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT DEFAULT 'web',
  is_enabled BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Enable RLS
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Index for quick lookups
CREATE INDEX idx_user_push_tokens_user_id ON public.user_push_tokens(user_id);
CREATE INDEX idx_user_push_tokens_enabled ON public.user_push_tokens(user_id, is_enabled) WHERE is_enabled = true;

-- =============================================
-- 3. PUSH LOG TABLE
-- =============================================
CREATE TABLE public.push_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT,
  payload JSONB,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.push_log ENABLE ROW LEVEL SECURITY;

-- Index for quick lookups
CREATE INDEX idx_push_log_user_id ON public.push_log(user_id);
CREATE INDEX idx_push_log_created_at ON public.push_log(created_at DESC);
CREATE INDEX idx_push_log_type ON public.push_log(type);

-- =============================================
-- 4. RLS POLICIES FOR USER_PUSH_TOKENS
-- =============================================

-- Users can manage their own tokens
CREATE POLICY "Users can manage own push tokens"
ON public.user_push_tokens
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =============================================
-- 5. RLS POLICIES FOR PUSH_LOG
-- =============================================

-- Users can view their own logs
CREATE POLICY "Users can view own push logs"
ON public.push_log
FOR SELECT
USING (user_id = auth.uid());

-- Admins can view all logs
CREATE POLICY "Admins can view all push logs"
ON public.push_log
FOR SELECT
USING (has_role(auth.uid(), 'administrateur'::app_role));

-- System can insert logs
CREATE POLICY "System can insert push logs"
ON public.push_log
FOR INSERT
WITH CHECK (true);

-- =============================================
-- 6. FUNCTION TO SEND PUSH NOTIFICATION
-- =============================================

CREATE OR REPLACE FUNCTION public.send_push_notification(
  p_user_ids UUID[],
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_type TEXT DEFAULT 'general'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tokens TEXT[];
  v_payload JSONB;
BEGIN
  -- Loop through each user
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    -- Get enabled tokens for this user
    SELECT array_agg(token)
    INTO v_tokens
    FROM public.user_push_tokens
    WHERE user_id = v_user_id
      AND is_enabled = true;

    -- Skip if no tokens found
    IF v_tokens IS NULL OR array_length(v_tokens, 1) IS NULL THEN
      CONTINUE;
    END IF;

    -- Build payload
    v_payload := jsonb_build_object(
      'user_id', v_user_id,
      'tokens', to_jsonb(v_tokens),
      'title', p_title,
      'body', p_body,
      'data', p_data
    );

    -- Call Edge Function via pg_net
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
      ),
      body := v_payload
    );

    -- Log the notification
    INSERT INTO public.push_log (user_id, type, payload, status)
    VALUES (v_user_id, p_type, v_payload, 'sent');

  END LOOP;
END;
$$;

-- =============================================
-- 7. TRIGGER FUNCTION FOR NEW ORDERS
-- =============================================

CREATE OR REPLACE FUNCTION public.trigger_push_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_ids UUID[];
  v_client_name TEXT;
  v_product_name TEXT;
BEGIN
  -- Get admins and supervisors
  SELECT array_agg(user_id)
  INTO v_admin_ids
  FROM public.user_roles
  WHERE role IN ('administrateur', 'superviseur');

  -- Skip if no admins found
  IF v_admin_ids IS NULL OR array_length(v_admin_ids, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get client name
  SELECT full_name INTO v_client_name
  FROM public.clients
  WHERE id = NEW.client_id;

  -- Get product name
  SELECT name INTO v_product_name
  FROM public.products
  WHERE id = NEW.product_id;

  -- Send push notification
  PERFORM public.send_push_notification(
    p_user_ids := v_admin_ids,
    p_title := 'Nouvelle commande',
    p_body := format('Commande %s - %s - %s DH', 
      COALESCE(NEW.order_number, 'N/A'),
      COALESCE(v_client_name, 'Client inconnu'),
      COALESCE(NEW.total_amount::text, '0')
    ),
    p_data := jsonb_build_object(
      'order_id', NEW.id,
      'order_number', NEW.order_number,
      'client_name', v_client_name,
      'product_name', v_product_name,
      'total_amount', NEW.total_amount,
      'type', 'new_order'
    ),
    p_type := 'new_order'
  );

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_push_new_order ON public.orders;
CREATE TRIGGER trigger_push_new_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trigger_push_new_order();

-- =============================================
-- 8. TRIGGER FUNCTION FOR CALLER ASSIGNMENT
-- =============================================

CREATE OR REPLACE FUNCTION public.trigger_push_assigned_caller()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name TEXT;
  v_product_name TEXT;
BEGIN
  -- Only trigger if assigned_to changed
  IF OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to THEN
    RETURN NEW;
  END IF;

  -- Skip if no assignment
  IF NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get client name
  SELECT full_name INTO v_client_name
  FROM public.clients
  WHERE id = NEW.client_id;

  -- Get product name
  SELECT name INTO v_product_name
  FROM public.products
  WHERE id = NEW.product_id;

  -- Send push notification
  PERFORM public.send_push_notification(
    p_user_ids := ARRAY[NEW.assigned_to],
    p_title := 'Nouvelle assignation',
    p_body := format('Commande %s assignée - %s - %s DH', 
      COALESCE(NEW.order_number, 'N/A'),
      COALESCE(v_client_name, 'Client inconnu'),
      COALESCE(NEW.total_amount::text, '0')
    ),
    p_data := jsonb_build_object(
      'order_id', NEW.id,
      'order_number', NEW.order_number,
      'client_name', v_client_name,
      'product_name', v_product_name,
      'total_amount', NEW.total_amount,
      'type', 'assigned_caller'
    ),
    p_type := 'assigned_caller'
  );

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_push_assigned_caller ON public.orders;
CREATE TRIGGER trigger_push_assigned_caller
AFTER UPDATE OF assigned_to ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trigger_push_assigned_caller();

-- =============================================
-- 9. TRIGGER FUNCTION FOR DELIVERY ASSIGNMENT
-- =============================================

CREATE OR REPLACE FUNCTION public.trigger_push_assigned_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery_user_id UUID;
  v_client_name TEXT;
  v_product_name TEXT;
BEGIN
  -- Only trigger if delivery_person_id changed
  IF OLD.delivery_person_id IS NOT DISTINCT FROM NEW.delivery_person_id THEN
    RETURN NEW;
  END IF;

  -- Skip if no assignment
  IF NEW.delivery_person_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get delivery person's user_id
  SELECT user_id INTO v_delivery_user_id
  FROM public.delivery_persons
  WHERE id = NEW.delivery_person_id;

  -- Skip if user_id not found
  IF v_delivery_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get client name
  SELECT full_name INTO v_client_name
  FROM public.clients
  WHERE id = NEW.client_id;

  -- Get product name
  SELECT name INTO v_product_name
  FROM public.products
  WHERE id = NEW.product_id;

  -- Send push notification
  PERFORM public.send_push_notification(
    p_user_ids := ARRAY[v_delivery_user_id],
    p_title := 'Nouvelle livraison',
    p_body := format('Commande %s à livrer - %s - %s', 
      COALESCE(NEW.order_number, 'N/A'),
      COALESCE(v_client_name, 'Client inconnu'),
      COALESCE(NEW.delivery_address, 'Adresse non spécifiée')
    ),
    p_data := jsonb_build_object(
      'order_id', NEW.id,
      'order_number', NEW.order_number,
      'client_name', v_client_name,
      'product_name', v_product_name,
      'delivery_address', NEW.delivery_address,
      'total_amount', NEW.total_amount,
      'type', 'assigned_delivery'
    ),
    p_type := 'assigned_delivery'
  );

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_push_assigned_delivery ON public.orders;
CREATE TRIGGER trigger_push_assigned_delivery
AFTER UPDATE OF delivery_person_id ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trigger_push_assigned_delivery();

-- =============================================
-- 10. TRIGGER FUNCTION FOR CHAT MESSAGES
-- =============================================

CREATE OR REPLACE FUNCTION public.trigger_push_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
BEGIN
  -- Skip if no receiver
  IF NEW.receiver_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get sender's full name
  SELECT full_name INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- Send push notification
  PERFORM public.send_push_notification(
    p_user_ids := ARRAY[NEW.receiver_id],
    p_title := COALESCE(v_sender_name, 'Nouveau message'),
    p_body := substring(NEW.content, 1, 100),
    p_data := jsonb_build_object(
      'message_id', NEW.id,
      'sender_id', NEW.sender_id,
      'sender_name', v_sender_name,
      'type', 'new_message'
    ),
    p_type := 'new_message'
  );

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_push_new_message ON public.messages;
CREATE TRIGGER trigger_push_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.trigger_push_new_message();

-- =============================================
-- 11. HELPER FUNCTION TO SET APP SETTINGS
-- =============================================

-- Note: These settings need to be configured at runtime
-- They cannot be hardcoded here for security reasons
COMMENT ON TABLE public.user_push_tokens IS 'Stores FCM push tokens for web push notifications';
COMMENT ON TABLE public.push_log IS 'Logs all push notification attempts';
COMMENT ON FUNCTION public.send_push_notification IS 'Sends push notifications via Edge Function using pg_net';
