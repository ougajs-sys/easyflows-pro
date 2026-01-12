
-- =====================================================
-- PHASE 1: Suppression du trigger dupliqué
-- =====================================================
DROP TRIGGER IF EXISTS deduct_delivery_stock_trigger ON public.orders;

-- =====================================================
-- PHASE 2: Correction des politiques RLS trop permissives
-- =====================================================

-- 1. Clients: Restreindre INSERT aux appelants, superviseurs et admins
DROP POLICY IF EXISTS "Authenticated users can create clients" ON public.clients;
CREATE POLICY "Appelants, superviseurs et admins can create clients" 
ON public.clients 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'appelant') OR 
  public.has_role(auth.uid(), 'superviseur') OR 
  public.has_role(auth.uid(), 'administrateur')
);

-- 2. Follow_ups: Restreindre INSERT aux appelants, superviseurs et admins
DROP POLICY IF EXISTS "Authenticated users can create follow ups" ON public.follow_ups;
CREATE POLICY "Appelants, superviseurs et admins can create follow ups" 
ON public.follow_ups 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'appelant') OR 
  public.has_role(auth.uid(), 'superviseur') OR 
  public.has_role(auth.uid(), 'administrateur')
);

-- 3. Orders: Restreindre INSERT aux appelants, superviseurs et admins
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;
CREATE POLICY "Appelants, superviseurs et admins can create orders" 
ON public.orders 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'appelant') OR 
  public.has_role(auth.uid(), 'superviseur') OR 
  public.has_role(auth.uid(), 'administrateur')
);

-- 4. Payments: Restreindre INSERT aux superviseurs et admins
DROP POLICY IF EXISTS "Authenticated users can create payments" ON public.payments;
CREATE POLICY "Superviseurs et admins can create payments" 
ON public.payments 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'superviseur') OR 
  public.has_role(auth.uid(), 'administrateur')
);

-- 5. Stock_alerts: Restreindre à service_role uniquement (système)
DROP POLICY IF EXISTS "System can create alerts" ON public.stock_alerts;
-- Les alertes sont créées par les triggers (SECURITY DEFINER), pas besoin de politique INSERT publique
