-- =============================================
-- FIX MISSING RLS POLICIES FOR PAYMENTS TABLE
-- =============================================
-- This migration fixes the RLS policies for the payments table to allow
-- users with roles 'administrateur', 'superviseur', or 'appelant' to
-- insert payment records. Previous migration restricted to only
-- superviseurs and admins, causing appelants to get 42501 errors.

-- =============================================
-- ADD ROLE-RESTRICTED INSERT POLICY FOR PAYMENTS
-- =============================================

-- Drop the overly permissive policy that allowed all authenticated users
DROP POLICY IF EXISTS "Authenticated users can create payments" ON public.payments;

-- Allow only administrateur, superviseur, and appelant roles to create payments
-- This aligns with the business requirement where these three roles can record payments
CREATE POLICY "Admins, superviseurs et appelants can create payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'administrateur'::app_role) OR 
    public.has_role(auth.uid(), 'superviseur'::app_role) OR
    public.has_role(auth.uid(), 'appelant'::app_role)
  );

-- =============================================
-- ADD ROLE-RESTRICTED UPDATE POLICY FOR PAYMENTS
-- =============================================

-- Drop any existing overly restrictive or permissive UPDATE policy
DROP POLICY IF EXISTS "Admins and supervisors can update payments" ON public.payments;

-- Allow administrateur, superviseur, and appelant roles to update payment records
-- This ensures consistency with the INSERT policy
CREATE POLICY "Admins, superviseurs et appelants can update payments"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrateur'::app_role) OR 
    public.has_role(auth.uid(), 'superviseur'::app_role) OR
    public.has_role(auth.uid(), 'appelant'::app_role)
  );

-- =============================================
-- ENHANCE ORDERS UPDATE POLICY FOR PAYMENT RECORDING
-- =============================================

-- Drop existing orders UPDATE policy and recreate with explicit appelant role
-- This ensures appelants can update order amounts when recording payments
DROP POLICY IF EXISTS "Admins supervisors and creators can update orders" ON public.orders;

CREATE POLICY "Admins supervisors appelants and creators can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrateur'::app_role) OR 
    public.has_role(auth.uid(), 'superviseur'::app_role) OR
    public.has_role(auth.uid(), 'appelant'::app_role) OR
    created_by = auth.uid()
  );

-- =============================================
-- SUMMARY
-- =============================================
-- PAYMENTS TABLE:
-- ✅ INSERT policy: Administrateur, superviseur, and appelant can create payments
-- ✅ UPDATE policy: Administrateur, superviseur, and appelant can modify payments
-- ✅ Existing SELECT policy: Users can view payments for their orders (from previous migration)
-- ✅ Existing DELETE policy: Only admins can delete payments (from previous migration)
--
-- ORDERS TABLE:
-- ✅ UPDATE policy: Enhanced to explicitly include appelant role in addition to admins,
--    superviseurs, and order creators. This ensures payment recording flow can update
--    order amounts (amount_paid, amount_due, status) without RLS errors.
--
-- This fixes the RLS error 42501 "new row violates row-level security policy"
-- that was occurring when appelants tried to record payments in OrderDetailPopup.
