-- =============================================
-- FIX MISSING RLS POLICIES FOR PAYMENTS TABLE
-- =============================================
-- This migration restores the missing INSERT and UPDATE policies
-- for the payments table that were dropped in the previous RLS fix
-- but not recreated, causing payment recording to fail.

-- =============================================
-- ADD MISSING INSERT POLICY FOR PAYMENTS
-- =============================================

-- Allow authenticated users to create payment records
CREATE POLICY "Authenticated users can create payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =============================================
-- ADD MISSING UPDATE POLICY FOR PAYMENTS
-- =============================================

-- Only admins and supervisors can update payment records
CREATE POLICY "Admins and supervisors can update payments"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrateur'::app_role) OR 
    public.has_role(auth.uid(), 'superviseur'::app_role)
  );

-- =============================================
-- SUMMARY
-- =============================================
-- ✅ INSERT policy: All authenticated users can create payments
-- ✅ UPDATE policy: Only admins and supervisors can modify payments
-- ✅ Existing SELECT policy: Users can view payments for their orders
-- ✅ Existing DELETE policy: Only admins can delete payments
