-- Remove clients with empty phone (can't be contacted, blocks unique constraint)
DELETE FROM public.clients WHERE phone = '' OR phone IS NULL;

-- Add unique constraint on clients.phone to enable upsert ON CONFLICT
ALTER TABLE public.clients ADD CONSTRAINT clients_phone_key UNIQUE (phone);