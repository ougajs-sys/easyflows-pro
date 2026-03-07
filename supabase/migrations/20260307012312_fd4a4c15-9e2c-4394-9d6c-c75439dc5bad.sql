CREATE OR REPLACE FUNCTION public.notify_role_request_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  topic text;
  payload jsonb;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IN ('approved','rejected') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    BEGIN
      topic := 'user:' || NEW.user_id::text || ':notifications';
      payload := jsonb_build_object(
        'type', 'role_request_decision',
        'request_id', NEW.id,
        'status', NEW.status,
        'requested_role', NEW.requested_role,
        'reviewed_by', NEW.reviewed_by,
        'reviewed_at', NEW.reviewed_at,
        'reason', NEW.reason
      );

      PERFORM realtime.send(
        topic,
        'role_request_decision',
        payload,
        true
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_role_request_decision failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$function$;