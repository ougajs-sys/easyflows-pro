-- Migration WhatsApp Messenger360 notifications: création logs, RLS et triggers

CREATE TABLE work_notification_logs (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  recipient_user_id UUID NOT NULL,
  recipient_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  status TEXT, -- success, error, pending
  error_message TEXT,
  provider TEXT DEFAULT 'messenger360',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activation RLS
ALTER TABLE work_notification_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Insert via service_role/unrestricted
CREATE POLICY "Allow insert for service role" ON work_notification_logs
  FOR INSERT TO authenticated
  USING (auth.role() = 'service_role');

-- Policy: select pour admin/superviseur ou UID concerné
CREATE POLICY "Allow select for privileged or owner" ON work_notification_logs
  FOR SELECT USING (
    auth.role() IN ('admin','superviseur') OR recipient_user_id = auth.uid()
  );

--
-- INSTRUCTIONS pour triggers à modifier/ajouter (orders, messages, revenue_deposits, stock_movements):
--
-- Après envoi FCM, ajoutez :
-- PERFORM http_post_with_service_role(
--   'https://<project-ref>.functions.supabase.co/send-work-notification',
--   json_build_object(
--     'event_type', ..., 'title', ..., 'body', ..., 'target_user_ids', ..., 'link', ...)
--   );
-- Cf. Edge Function send-work-notification pour format.