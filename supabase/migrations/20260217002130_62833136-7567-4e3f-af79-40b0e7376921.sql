
-- Assign remaining unassigned clients to batch 6 (Group-C-6)
UPDATE clients 
SET campaign_batch = 6 
WHERE campaign_batch IS NULL;
