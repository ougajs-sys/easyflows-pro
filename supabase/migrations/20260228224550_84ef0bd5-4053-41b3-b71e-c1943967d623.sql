-- Backfill phone_normalized for valid CI numbers
UPDATE clients
SET phone_normalized = 
  CASE
    WHEN phone ~ '^(\+?225|00225)' THEN
      regexp_replace(regexp_replace(phone, '[\s\-\(\)\.]', '', 'g'), '^(\+|00)', '', 'g')
    WHEN phone ~ '^0[0-9]{9}$' THEN
      '225' || substring(regexp_replace(phone, '[\s\-\(\)\.]', '', 'g') from 2)
    ELSE
      regexp_replace(regexp_replace(phone, '[\s\-\(\)\.]', '', 'g'), '^(\+|00)', '', 'g')
  END,
  country_code = 'CI'
WHERE phone_normalized IS NULL
  AND regexp_replace(
    CASE
      WHEN phone ~ '^(\+?225|00225)' THEN
        regexp_replace(regexp_replace(phone, '[\s\-\(\)\.]', '', 'g'), '^(\+|00)', '', 'g')
      WHEN phone ~ '^0[0-9]{9}$' THEN
        '225' || substring(regexp_replace(phone, '[\s\-\(\)\.]', '', 'g') from 2)
      ELSE
        regexp_replace(regexp_replace(phone, '[\s\-\(\)\.]', '', 'g'), '^(\+|00)', '', 'g')
    END,
    '^225([0-9]{10})$', '\1'
  ) ~ '^(01|05|07|21|22|23|24|25|27)';

-- Create function for phone normalization trigger
CREATE OR REPLACE FUNCTION normalize_ci_phone()
RETURNS TRIGGER AS $$
DECLARE
  cleaned text;
  local_part text;
BEGIN
  cleaned := regexp_replace(NEW.phone, '[\s\-\(\)\.]', '', 'g');
  cleaned := regexp_replace(cleaned, '^(\+|00)', '', 'g');
  
  IF cleaned ~ '^0[0-9]{9}$' THEN
    cleaned := '225' || substring(cleaned from 2);
  END IF;
  
  IF cleaned ~ '^225[0-9]{10}$' THEN
    local_part := substring(cleaned from 4 for 2);
    IF local_part IN ('01', '05', '07', '21', '22', '23', '24', '25', '27') THEN
      NEW.phone_normalized := cleaned;
      NEW.country_code := 'CI';
    ELSE
      NEW.phone_normalized := NULL;
    END IF;
  ELSE
    NEW.phone_normalized := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_normalize_ci_phone ON clients;
CREATE TRIGGER trg_normalize_ci_phone
  BEFORE INSERT OR UPDATE OF phone ON clients
  FOR EACH ROW
  EXECUTE FUNCTION normalize_ci_phone();