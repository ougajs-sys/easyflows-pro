
-- Fix http_post_with_service_role to use correct net.http_post parameter order
CREATE OR REPLACE FUNCTION public.http_post_with_service_role(url text, body jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
  service_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFweHp1Z2x2dmZ2b29rem1wZ2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NzA3NzYsImV4cCI6MjA4MjQ0Njc3Nn0.Km_gUYYcjHSTbkZIu6_QIYT4bCa6SXZc0eXV3FwYhrc';
  request_id bigint;
begin
  -- Use positional arguments to avoid named parameter signature mismatch
  SELECT net.http_post(
    url,
    body,
    '{}'::jsonb,
    jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    10000
  ) INTO request_id;
  
  return jsonb_build_object('status', 'sent', 'request_id', request_id);
exception when others then
  raise warning 'http_post_with_service_role error: %', sqlerrm;
  return jsonb_build_object('status', 'error', 'message', sqlerrm);
end;
$$;
