-- =============================================
-- ENHANCED RLS POLICIES FOR SECURITY
-- =============================================
-- This migration adds improved Row-Level Security policies
-- for user isolation and role-based access control

-- =============================================
-- 1. DROP EXISTING OVERLY PERMISSIVE POLICIES
-- =============================================

-- Drop the existing overly permissive policies on clients
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can create clients" ON public.clients;

-- =============================================
-- 2. CLIENTS - ENHANCED USER ISOLATION
-- =============================================

-- Users can view own clients or admins/supervisors can view all
CREATE POLICY "Users can view own clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR 
    public.has_role(auth.uid(), 'administrateur'::app_role) OR 
    public.has_role(auth.uid(), 'superviseur'::app_role)
  );

-- Users can create clients (will be automatically owned by creator)
CREATE POLICY "Users can create clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() OR 
    public.has_role(auth.uid(), 'administrateur'::app_role)
  );

-- =============================================
-- 3. CAMPAIGNS - SUPERVISOR AND ADMIN ONLY
-- =============================================

-- Check if campaigns table exists and add policies
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'campaigns'
  ) THEN
    -- Drop existing overly permissive policies if they exist
    DROP POLICY IF EXISTS "Authenticated users can view campaigns" ON public.campaigns;
    DROP POLICY IF EXISTS "Authenticated users can create campaigns" ON public.campaigns;
    DROP POLICY IF EXISTS "Authenticated users can update campaigns" ON public.campaigns;

    -- Only supervisors and admins can manage campaigns
    EXECUTE 'CREATE POLICY "Only supervisors and admins can view campaigns"
      ON public.campaigns FOR SELECT
      TO authenticated
      USING (
        public.has_role(auth.uid(), ''administrateur''::app_role) OR 
        public.has_role(auth.uid(), ''superviseur''::app_role)
      )';

    EXECUTE 'CREATE POLICY "Only supervisors and admins can create campaigns"
      ON public.campaigns FOR INSERT
      TO authenticated
      WITH CHECK (
        public.has_role(auth.uid(), ''administrateur''::app_role) OR 
        public.has_role(auth.uid(), ''superviseur''::app_role)
      )';

    EXECUTE 'CREATE POLICY "Only supervisors and admins can manage campaigns"
      ON public.campaigns FOR ALL
      TO authenticated
      USING (
        public.has_role(auth.uid(), ''administrateur''::app_role) OR 
        public.has_role(auth.uid(), ''superviseur''::app_role)
      )';
  END IF;
END $$;

-- =============================================
-- 4. ORDERS - ENHANCED VISIBILITY CONTROL
-- =============================================

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view orders" ON public.orders;

-- Users can only view orders they created, or admins/supervisors can view all
CREATE POLICY "Users can view own orders or admins view all"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    assigned_to = auth.uid() OR
    delivery_person_id IN (
      SELECT id FROM public.delivery_persons WHERE user_id = auth.uid()
    ) OR
    public.has_role(auth.uid(), 'administrateur'::app_role) OR 
    public.has_role(auth.uid(), 'superviseur'::app_role)
  );

-- =============================================
-- 5. PAYMENTS - RESTRICTED ACCESS
-- =============================================

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.payments;

-- Only admins, supervisors, and order creators can view payments
CREATE POLICY "Restricted payment visibility"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrateur'::app_role) OR 
    public.has_role(auth.uid(), 'superviseur'::app_role) OR
    order_id IN (
      SELECT id FROM public.orders WHERE created_by = auth.uid()
    )
  );

-- Only admins and supervisors can delete payments
CREATE POLICY "Only admins can delete payments"
  ON public.payments FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrateur'::app_role));

-- =============================================
-- 6. FOLLOW-UPS - USER ISOLATION
-- =============================================

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view follow ups" ON public.follow_ups;

-- Users can only view their own follow-ups or admins/supervisors view all
CREATE POLICY "Users can view own follow ups"
  ON public.follow_ups FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    public.has_role(auth.uid(), 'administrateur'::app_role) OR 
    public.has_role(auth.uid(), 'superviseur'::app_role)
  );

-- =============================================
-- 7. PRODUCTS - READ-ONLY FOR MOST USERS
-- =============================================

-- Products are already properly secured (admins-only write access)
-- No changes needed for products table

-- =============================================
-- 8. CREATE AUDIT LOG TABLE (Optional but recommended)
-- =============================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrateur'::app_role));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- =============================================
-- 9. FUNCTION FOR AUDIT LOGGING
-- =============================================

CREATE OR REPLACE FUNCTION public.log_audit_entry(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (auth.uid(), p_action, p_table_name, p_record_id, p_old_data, p_new_data);
END;
$$;

-- =============================================
-- SUMMARY OF CHANGES
-- =============================================
-- ✅ Clients: User isolation - users can only see their own clients
-- ✅ Campaigns: Supervisor and admin only access
-- ✅ Orders: Enhanced visibility control based on creator/assignment
-- ✅ Payments: Restricted to relevant users and admins
-- ✅ Follow-ups: User isolation implemented
-- ✅ Audit logging: New table for tracking sensitive actions
