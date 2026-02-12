CREATE OR REPLACE FUNCTION public.http_post_with_service_role(url text, body jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
declare
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFweHp1Z2x2dmZ2b29rem1wZ2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NzA3NzYsImV4cCI6MjA4MjQ0Njc3Nn0.Km_gUYYcjHSTbkZIu6_QIYT4bCa6SXZc0eXV3FwYhrc';
  resp record;
begin
  select * into resp from net.http_post(
    url := url,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := body::text,
    timeout_milliseconds := 10000
  );
  return jsonb_build_object('status', resp.status_code, 'body', resp.response_body);
end;
$$;