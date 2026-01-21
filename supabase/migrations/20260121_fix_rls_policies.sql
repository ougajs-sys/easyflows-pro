-- =====================================================
-- MIGRATION: FIX RLS POLICIES - COMPLETE SECURITY
-- =====================================================
-- Cette migration renforce la sécurité de toutes les tables
-- avec des Row Level Security (RLS) policies appropriées
-- 
-- Objectifs:
-- 1. Isolation complète des données par utilisateur
-- 2. Protection contre les accès non autorisés
-- 3. Contrôle d'accès basé sur les rôles
-- =====================================================

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.embed_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.integrations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DROP EXISTING POLICIES (si elles existent)
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Service role can manage all orders" ON public.orders;

DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;

DROP POLICY IF EXISTS "Users can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

-- =====================================================
-- ORDERS TABLE POLICIES
-- =====================================================

-- Les utilisateurs peuvent voir seulement leurs propres commandes
CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  -- Les superviseurs et admins peuvent voir toutes les commandes
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'supervisor')
  )
);

-- Les utilisateurs peuvent créer des commandes
CREATE POLICY "Users can create orders"
ON public.orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs peuvent mettre à jour leurs propres commandes
CREATE POLICY "Users can update their own orders"
ON public.orders
FOR UPDATE
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'supervisor')
  )
);

-- Service role peut tout gérer (pour les webhooks)
CREATE POLICY "Service role can manage all orders"
ON public.orders
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- CLIENTS TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view their own clients"
ON public.clients
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'supervisor')
  )
);

CREATE POLICY "Users can create clients"
ON public.clients
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
ON public.clients
FOR UPDATE
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'supervisor')
  )
);

CREATE POLICY "Service role can manage all clients"
ON public.clients
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- PRODUCTS TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view products"
ON public.products
FOR SELECT
USING (true); -- Tous les utilisateurs authentifiés peuvent voir les produits

CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- =====================================================
-- CAMPAIGNS TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view their own campaigns"
ON public.campaigns
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'supervisor')
  )
);

CREATE POLICY "Users can create campaigns"
ON public.campaigns
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
ON public.campaigns
FOR UPDATE
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'supervisor')
  )
);

-- =====================================================
-- NOTIFICATIONS TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view their notifications"
ON public.notifications
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'supervisor')
  )
);

-- =====================================================
-- PAYMENTS TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view their own payments"
ON public.payments
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'supervisor')
  )
);

CREATE POLICY "Service role can manage payments"
ON public.payments
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- EMBED FORMS TABLE POLICIES
-- =====================================================

CREATE POLICY "Admins can manage embed forms"
ON public.embed_forms
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Users can view embed forms"
ON public.embed_forms
FOR SELECT
USING (true);

-- =====================================================
-- INTEGRATIONS TABLE POLICIES
-- =====================================================

CREATE POLICY "Admins can manage integrations"
ON public.integrations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- =====================================================
-- AUDIT LOG (pour tracking des changements)
-- =====================================================

-- Créer une table d'audit si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS sur audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent voir les logs d'audit
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- =====================================================
-- FUNCTIONS FOR AUDIT LOGGING
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, table_name, operation, old_data)
    VALUES (auth.uid(), TG_TABLE_NAME, TG_OP, row_to_json(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, table_name, operation, old_data, new_data)
    VALUES (auth.uid(), TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, table_name, operation, new_data)
    VALUES (auth.uid(), TG_TABLE_NAME, TG_OP, row_to_json(NEW));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ajouter des triggers d'audit sur les tables importantes
DROP TRIGGER IF EXISTS audit_orders ON public.orders;
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();

DROP TRIGGER IF EXISTS audit_payments ON public.payments;
CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Créer des index pour optimiser les requêtes avec RLS
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON POLICY "Users can view their own orders" ON public.orders IS 
  'Les utilisateurs peuvent voir seulement leurs propres commandes, sauf les admins/superviseurs';

COMMENT ON POLICY "Service role can manage all orders" ON public.orders IS 
  'Le service role (webhooks) peut créer des commandes sans restriction';

COMMENT ON TABLE public.audit_logs IS 
  'Table d''audit pour tracker tous les changements importants dans la base de données';
