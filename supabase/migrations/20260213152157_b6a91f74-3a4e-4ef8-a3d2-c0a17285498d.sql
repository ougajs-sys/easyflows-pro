
-- Clean up zombie follow-ups (orders already finalized)
UPDATE public.follow_ups 
SET status = 'completed', completed_at = now() 
WHERE status = 'pending' 
  AND order_id IN (SELECT id FROM orders WHERE status IN ('delivered','confirmed','cancelled'));

-- Clean up zombie scheduled_followups
UPDATE public.scheduled_followups
SET status = 'completed', updated_at = now()
WHERE status = 'pending'
  AND order_id IN (SELECT id FROM orders WHERE status IN ('delivered','confirmed','cancelled'));
