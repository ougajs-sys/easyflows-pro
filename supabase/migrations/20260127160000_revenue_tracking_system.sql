-- =============================================
-- REVENUE TRACKING & DEPOSIT SYSTEM
-- =============================================
-- This migration adds tables and logic to track collected revenues
-- and deposit operations for caller payment tracking

-- =============================================
-- 1. CREATE REVENUE STATUS ENUM
-- =============================================

CREATE TYPE public.revenue_status AS ENUM ('collected', 'deposited');

-- =============================================
-- 2. TABLE COLLECTED_REVENUES
-- =============================================
-- Tracks each payment as a collected revenue linked to a caller
-- This is created automatically when a payment is recorded

CREATE TABLE public.collected_revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method payment_method NOT NULL,
  collected_by UUID NOT NULL REFERENCES auth.users(id),
  status revenue_status NOT NULL DEFAULT 'collected',
  deposit_id UUID,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collected_revenues ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_collected_revenues_collected_by ON public.collected_revenues(collected_by);
CREATE INDEX idx_collected_revenues_status ON public.collected_revenues(status);
CREATE INDEX idx_collected_revenues_deposit_id ON public.collected_revenues(deposit_id);
CREATE INDEX idx_collected_revenues_collected_at ON public.collected_revenues(collected_at DESC);
CREATE INDEX idx_collected_revenues_payment_id ON public.collected_revenues(payment_id);

-- =============================================
-- 3. TABLE REVENUE_DEPOSITS
-- =============================================
-- Tracks deposit operations when callers declare they've deposited their revenues

CREATE TABLE public.revenue_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposited_by UUID NOT NULL REFERENCES auth.users(id),
  total_amount DECIMAL(12, 2) NOT NULL,
  revenue_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  deposited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.revenue_deposits ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_revenue_deposits_deposited_by ON public.revenue_deposits(deposited_by);
CREATE INDEX idx_revenue_deposits_deposited_at ON public.revenue_deposits(deposited_at DESC);

-- =============================================
-- 4. ADD FOREIGN KEY CONSTRAINT
-- =============================================
-- Link collected_revenues to revenue_deposits

ALTER TABLE public.collected_revenues
  ADD CONSTRAINT fk_collected_revenues_deposit
  FOREIGN KEY (deposit_id) REFERENCES public.revenue_deposits(id) ON DELETE SET NULL;

-- =============================================
-- 5. ROW LEVEL SECURITY POLICIES
-- =============================================

-- Collected Revenues Policies
-- Callers can view their own collected revenues
CREATE POLICY "Callers can view own collected revenues"
  ON public.collected_revenues
  FOR SELECT
  USING (
    collected_by = auth.uid()
    OR has_role(auth.uid(), 'superviseur'::app_role)
    OR has_role(auth.uid(), 'administrateur'::app_role)
  );

-- Callers can insert their own collected revenues (done via trigger/app logic)
CREATE POLICY "Callers can insert own collected revenues"
  ON public.collected_revenues
  FOR INSERT
  WITH CHECK (
    collected_by = auth.uid()
    OR has_role(auth.uid(), 'superviseur'::app_role)
    OR has_role(auth.uid(), 'administrateur'::app_role)
  );

-- Only callers can update their own revenues (for deposit marking)
CREATE POLICY "Callers can update own collected revenues"
  ON public.collected_revenues
  FOR UPDATE
  USING (
    collected_by = auth.uid()
    OR has_role(auth.uid(), 'superviseur'::app_role)
    OR has_role(auth.uid(), 'administrateur'::app_role)
  );

-- Revenue Deposits Policies
-- Callers can view their own deposits, supervisors and admins can view all
CREATE POLICY "Users can view own deposits, supervisors view all"
  ON public.revenue_deposits
  FOR SELECT
  USING (
    deposited_by = auth.uid()
    OR has_role(auth.uid(), 'superviseur'::app_role)
    OR has_role(auth.uid(), 'administrateur'::app_role)
  );

-- Callers can create their own deposits
CREATE POLICY "Callers can create own deposits"
  ON public.revenue_deposits
  FOR INSERT
  WITH CHECK (deposited_by = auth.uid());

-- =============================================
-- 6. FUNCTION TO AUTO-CREATE COLLECTED REVENUE ON PAYMENT
-- =============================================
-- This trigger function automatically creates a collected_revenue record
-- whenever a payment is successfully created

CREATE OR REPLACE FUNCTION public.create_collected_revenue_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create collected revenue for completed payments with positive amounts
  IF NEW.status = 'completed' 
     AND NEW.received_by IS NOT NULL 
     AND NEW.amount IS NOT NULL
     AND NEW.amount > 0 THEN
    INSERT INTO public.collected_revenues (
      payment_id,
      order_id,
      amount,
      payment_method,
      collected_by,
      status,
      collected_at
    ) VALUES (
      NEW.id,
      NEW.order_id,
      NEW.amount,
      NEW.method,
      NEW.received_by,
      'collected',
      NEW.created_at
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- =============================================
-- 7. TRIGGER TO AUTO-CREATE COLLECTED REVENUE
-- =============================================

CREATE TRIGGER trigger_create_collected_revenue
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_collected_revenue_on_payment();

-- =============================================
-- 8. FUNCTION TO PROCESS REVENUE DEPOSIT
-- =============================================
-- This function handles the deposit operation:
-- 1. Creates a deposit record
-- 2. Marks all collected (non-deposited) revenues as deposited
-- 3. Returns the deposit summary

CREATE OR REPLACE FUNCTION public.process_revenue_deposit(
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  deposit_id UUID,
  total_amount DECIMAL,
  revenue_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deposit_id UUID;
  v_total_amount DECIMAL;
  v_revenue_count INTEGER;
BEGIN
  -- Calculate total amount and count of collected revenues
  SELECT 
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO v_total_amount, v_revenue_count
  FROM public.collected_revenues
  WHERE collected_by = p_user_id
    AND status = 'collected';

  -- Only create deposit if there are revenues to deposit
  IF v_revenue_count > 0 THEN
    -- Create deposit record
    INSERT INTO public.revenue_deposits (
      deposited_by,
      total_amount,
      revenue_count,
      notes
    ) VALUES (
      p_user_id,
      v_total_amount,
      v_revenue_count,
      p_notes
    ) RETURNING id INTO v_deposit_id;

    -- Update collected revenues to mark as deposited
    UPDATE public.collected_revenues
    SET 
      status = 'deposited',
      deposit_id = v_deposit_id
    WHERE collected_by = p_user_id
      AND status = 'collected';

    -- Return deposit summary
    RETURN QUERY
    SELECT v_deposit_id, v_total_amount, v_revenue_count;
  ELSE
    -- No revenues to deposit
    RAISE EXCEPTION 'No collected revenues to deposit';
  END IF;
END;
$$;

-- =============================================
-- 9. HELPER FUNCTION TO GET CALLER REVENUE SUMMARY
-- =============================================
-- Returns summary of collected and deposited revenues for a caller

CREATE OR REPLACE FUNCTION public.get_caller_revenue_summary(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_collected DECIMAL,
  total_deposited DECIMAL,
  total_to_deposit DECIMAL,
  collected_count INTEGER,
  deposited_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN status = 'collected' THEN amount ELSE 0 END), 0) as total_collected,
    COALESCE(SUM(CASE WHEN status = 'deposited' THEN amount ELSE 0 END), 0) as total_deposited,
    COALESCE(SUM(CASE WHEN status = 'collected' THEN amount ELSE 0 END), 0) as total_to_deposit,
    COUNT(CASE WHEN status = 'collected' THEN 1 END)::INTEGER as collected_count,
    COUNT(CASE WHEN status = 'deposited' THEN 1 END)::INTEGER as deposited_count
  FROM public.collected_revenues
  WHERE collected_by = p_user_id
    AND (p_start_date IS NULL OR collected_at >= p_start_date)
    AND (p_end_date IS NULL OR collected_at <= p_end_date);
END;
$$;

-- =============================================
-- 10. COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE public.collected_revenues IS 'Tracks each payment as a collected revenue, automatically created when a payment is recorded';
COMMENT ON TABLE public.revenue_deposits IS 'Tracks deposit operations when callers declare they have deposited their collected revenues';
COMMENT ON FUNCTION public.create_collected_revenue_on_payment() IS 'Trigger function that automatically creates a collected_revenue record when a payment is created';
COMMENT ON FUNCTION public.process_revenue_deposit(UUID, TEXT) IS 'Processes a revenue deposit operation, marking all collected revenues as deposited';
COMMENT ON FUNCTION public.get_caller_revenue_summary(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS 'Returns revenue summary for a caller within an optional date range';
