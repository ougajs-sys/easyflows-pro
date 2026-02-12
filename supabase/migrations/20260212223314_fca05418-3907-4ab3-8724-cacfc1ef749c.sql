-- Drop the broken trigger that references non-existent app.settings.project_ref
DROP TRIGGER IF EXISTS trg_messages_push ON public.messages;

-- Optionally drop the function too since it's no longer needed
DROP FUNCTION IF EXISTS public.notify_receiver_push();