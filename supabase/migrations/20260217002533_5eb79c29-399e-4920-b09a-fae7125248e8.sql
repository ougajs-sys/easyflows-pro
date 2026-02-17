
CREATE OR REPLACE FUNCTION public.auto_assign_campaign_batch()
RETURNS TRIGGER AS $$
DECLARE
  current_batch integer;
  current_count integer;
BEGIN
  -- Only assign if not already set
  IF NEW.campaign_batch IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Find the highest batch number and its count
  SELECT campaign_batch, count(*)
  INTO current_batch, current_count
  FROM clients
  WHERE campaign_batch IS NOT NULL
  GROUP BY campaign_batch
  ORDER BY campaign_batch DESC
  LIMIT 1;

  -- If no batches exist yet, start at 1
  IF current_batch IS NULL THEN
    NEW.campaign_batch := 1;
  -- If current batch is full (>=500), create next batch
  ELSIF current_count >= 500 THEN
    NEW.campaign_batch := current_batch + 1;
  ELSE
    NEW.campaign_batch := current_batch;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Attach trigger before insert
CREATE TRIGGER trg_auto_campaign_batch
BEFORE INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_campaign_batch();
