-- Revenue Tracking System Migration (Idempotent)
-- This migration creates the collected_revenues and revenue_deposits tables
-- along with necessary functions and triggers

-- Step 1: Create the enum type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.revenue_status AS ENUM ('collected', 'deposited');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create collected_revenues table
CREATE TABLE IF NOT EXISTS public.collected_revenues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  collected_by UUID NOT NULL,
  collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status revenue_status NOT NULL DEFAULT 'collected',
  deposit_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 3: Create revenue_deposits table
CREATE TABLE IF NOT EXISTS public.revenue_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deposited_by UUID NOT NULL,
  total_amount NUMERIC NOT NULL,
  revenues_count INTEGER NOT NULL DEFAULT 0,
  deposited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 4: Add foreign key for deposit_id if not exists
DO $$ BEGIN
  ALTER TABLE public.collected_revenues 
    ADD CONSTRAINT fk_collected_revenues_deposit 
    FOREIGN KEY (deposit_id) REFERENCES public.revenue_deposits(id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collected_revenues_collected_by 
  ON public.collected_revenues(collected_by);
CREATE INDEX IF NOT EXISTS idx_collected_revenues_status 
  ON public.collected_revenues(status);
CREATE INDEX IF NOT EXISTS idx_collected_revenues_collected_at 
  ON public.collected_revenues(collected_at);
CREATE INDEX IF NOT EXISTS idx_revenue_deposits_deposited_by 
  ON public.revenue_deposits(deposited_by);

-- Step 6: Enable RLS
ALTER TABLE public.collected_revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_deposits ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for collected_revenues
DROP POLICY IF EXISTS "Users can view own collected revenues" ON public.collected_revenues;
CREATE POLICY "Users can view own collected revenues" 
  ON public.collected_revenues FOR SELECT 
  USING (collected_by = auth.uid());

DROP POLICY IF EXISTS "Users can insert own collected revenues" ON public.collected_revenues;
CREATE POLICY "Users can insert own collected revenues" 
  ON public.collected_revenues FOR INSERT 
  WITH CHECK (collected_by = auth.uid());

DROP POLICY IF EXISTS "Users can update own collected revenues" ON public.collected_revenues;
CREATE POLICY "Users can update own collected revenues" 
  ON public.collected_revenues FOR UPDATE 
  USING (collected_by = auth.uid());

DROP POLICY IF EXISTS "Supervisors and admins can view all revenues" ON public.collected_revenues;
CREATE POLICY "Supervisors and admins can view all revenues" 
  ON public.collected_revenues FOR SELECT 
  USING (
    has_role(auth.uid(), 'superviseur'::app_role) OR 
    has_role(auth.uid(), 'administrateur'::app_role)
  );

-- Step 8: Create RLS policies for revenue_deposits
DROP POLICY IF EXISTS "Users can view own deposits" ON public.revenue_deposits;
CREATE POLICY "Users can view own deposits" 
  ON public.revenue_deposits FOR SELECT 
  USING (deposited_by = auth.uid());

DROP POLICY IF EXISTS "Users can insert own deposits" ON public.revenue_deposits;
CREATE POLICY "Users can insert own deposits" 
  ON public.revenue_deposits FOR INSERT 
  WITH CHECK (deposited_by = auth.uid());

DROP POLICY IF EXISTS "Supervisors and admins can view all deposits" ON public.revenue_deposits;
CREATE POLICY "Supervisors and admins can view all deposits" 
  ON public.revenue_deposits FOR SELECT 
  USING (
    has_role(auth.uid(), 'superviseur'::app_role) OR 
    has_role(auth.uid(), 'administrateur'::app_role)
  );

-- Step 9: Create the get_caller_revenue_summary function
CREATE OR REPLACE FUNCTION public.get_caller_revenue_summary(
  p_user_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE(
  total_collected NUMERIC,
  total_deposited NUMERIC,
  total_to_deposit NUMERIC,
  collected_count INTEGER,
  deposited_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Use today's start if not provided
  v_start_date := COALESCE(p_start_date, (CURRENT_DATE)::TIMESTAMP WITH TIME ZONE);
  
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN cr.status = 'collected' THEN cr.amount ELSE 0 END), 0)::NUMERIC as total_collected,
    COALESCE(SUM(CASE WHEN cr.status = 'deposited' THEN cr.amount ELSE 0 END), 0)::NUMERIC as total_deposited,
    COALESCE(SUM(CASE WHEN cr.status = 'collected' THEN cr.amount ELSE 0 END), 0)::NUMERIC as total_to_deposit,
    COUNT(CASE WHEN cr.status = 'collected' THEN 1 END)::INTEGER as collected_count,
    COUNT(CASE WHEN cr.status = 'deposited' THEN 1 END)::INTEGER as deposited_count
  FROM public.collected_revenues cr
  WHERE cr.collected_by = p_user_id
    AND cr.collected_at >= v_start_date;
END;
$$;

-- Step 10: Create the process_revenue_deposit function
CREATE OR REPLACE FUNCTION public.process_revenue_deposit(
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deposit_id UUID;
  v_total_amount NUMERIC;
  v_count INTEGER;
BEGIN
  -- Calculate totals from undeposited revenues
  SELECT COALESCE(SUM(amount), 0), COUNT(*)
  INTO v_total_amount, v_count
  FROM public.collected_revenues
  WHERE collected_by = p_user_id
    AND status = 'collected';
  
  IF v_count = 0 THEN
    RAISE EXCEPTION 'No revenues to deposit';
  END IF;
  
  -- Create the deposit record
  INSERT INTO public.revenue_deposits (deposited_by, total_amount, revenues_count, notes)
  VALUES (p_user_id, v_total_amount, v_count, p_notes)
  RETURNING id INTO v_deposit_id;
  
  -- Update all collected revenues to deposited
  UPDATE public.collected_revenues
  SET status = 'deposited',
      deposit_id = v_deposit_id,
      updated_at = now()
  WHERE collected_by = p_user_id
    AND status = 'collected';
  
  RETURN v_deposit_id;
END;
$$;

-- Step 11: Create the trigger function to auto-create collected_revenue on payment completion
CREATE OR REPLACE FUNCTION public.create_collected_revenue_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create revenue record when payment is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Check if a record already exists for this payment
    IF NOT EXISTS (SELECT 1 FROM public.collected_revenues WHERE payment_id = NEW.id) THEN
      INSERT INTO public.collected_revenues (
        payment_id,
        order_id,
        amount,
        collected_by,
        collected_at
      ) VALUES (
        NEW.id,
        NEW.order_id,
        NEW.amount,
        COALESCE(NEW.received_by, auth.uid()),
        now()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 12: Create the trigger on payments table
DROP TRIGGER IF EXISTS trigger_create_collected_revenue ON public.payments;
CREATE TRIGGER trigger_create_collected_revenue
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_collected_revenue_on_payment();

-- Step 13: Create updated_at trigger for collected_revenues
DROP TRIGGER IF EXISTS set_collected_revenues_updated_at ON public.collected_revenues;
CREATE TRIGGER set_collected_revenues_updated_at
  BEFORE UPDATE ON public.collected_revenues
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();