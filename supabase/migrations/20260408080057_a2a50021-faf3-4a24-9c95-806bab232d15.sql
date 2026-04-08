DELETE FROM campaign_queue_control
WHERE campaign_id IN (
  SELECT id FROM campaigns WHERE status IN ('completed', 'cancelled')
);