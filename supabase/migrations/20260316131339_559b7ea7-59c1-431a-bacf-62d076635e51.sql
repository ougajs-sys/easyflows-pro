
-- Cron job to process campaign queue every minute
SELECT cron.schedule(
  'process-campaign-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qpxzuglvvfvookzmpgfe.supabase.co/functions/v1/process-campaign-queue',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFweHp1Z2x2dmZ2b29rem1wZ2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NzA3NzYsImV4cCI6MjA4MjQ0Njc3Nn0.Km_gUYYcjHSTbkZIu6_QIYT4bCa6SXZc0eXV3FwYhrc"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
