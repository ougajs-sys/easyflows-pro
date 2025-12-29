-- =============================================
-- 1. CRÉATION DES TYPES ENUM
-- =============================================

-- Rôles utilisateurs
CREATE TYPE public.app_role AS ENUM ('appelant', 'livreur', 'superviseur', 'administrateur');

-- Statut des commandes
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'in_transit', 'delivered', 'partial', 'cancelled', 'reported');

-- Méthodes de paiement
CREATE TYPE public.payment_method AS ENUM ('cash', 'mobile_money', 'card', 'transfer');

-- Statut des paiements
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Segmentation clients
CREATE TYPE public.client_segment AS ENUM ('new', 'regular', 'vip', 'inactive', 'problematic');

-- Statut des livreurs
CREATE TYPE public.delivery_status AS ENUM ('available', 'busy', 'offline');

-- Type de relance
CREATE TYPE public.followup_type AS ENUM ('reminder', 'partial_payment', 'rescheduled', 'retargeting');

-- Statut de relance
CREATE TYPE public.followup_status AS ENUM ('pending', 'completed', 'cancelled');

-- =============================================
-- 2. TABLE PROFILES
-- =============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. TABLE USER_ROLES (sécurité des rôles)
-- =============================================

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'appelant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. FONCTION UTILITAIRE has_role (SECURITY DEFINER)
-- =============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- =============================================
-- 5. TABLE CLIENTS
-- =============================================

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_secondary TEXT,
  address TEXT,
  city TEXT,
  zone TEXT,
  segment client_segment NOT NULL DEFAULT 'new',
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent DECIMAL(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_clients_phone ON public.clients(phone);
CREATE INDEX idx_clients_segment ON public.clients(segment);

-- =============================================
-- 6. TABLE PRODUCTS
-- =============================================

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. TABLE DELIVERY_PERSONS (livreurs)
-- =============================================

CREATE TABLE public.delivery_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zone TEXT,
  vehicle_type TEXT,
  status delivery_status NOT NULL DEFAULT 'offline',
  daily_deliveries INTEGER NOT NULL DEFAULT 0,
  daily_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.delivery_persons ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_delivery_persons_status ON public.delivery_persons(status);
CREATE INDEX idx_delivery_persons_zone ON public.delivery_persons(zone);

-- =============================================
-- 8. TABLE ORDERS (commandes)
-- =============================================

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  product_id UUID REFERENCES public.products(id),
  delivery_person_id UUID REFERENCES public.delivery_persons(id),
  created_by UUID REFERENCES auth.users(id),
  
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  amount_paid DECIMAL(12, 2) NOT NULL DEFAULT 0,
  amount_due DECIMAL(12, 2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  
  status order_status NOT NULL DEFAULT 'pending',
  delivery_address TEXT,
  delivery_notes TEXT,
  scheduled_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  cancellation_reason TEXT,
  report_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_client ON public.orders(client_id);
CREATE INDEX idx_orders_delivery_person ON public.orders(delivery_person_id);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);

-- =============================================
-- 9. TABLE PAYMENTS
-- =============================================

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  method payment_method NOT NULL DEFAULT 'cash',
  status payment_status NOT NULL DEFAULT 'pending',
  reference TEXT,
  received_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_payments_order ON public.payments(order_id);
CREATE INDEX idx_payments_status ON public.payments(status);

-- =============================================
-- 10. TABLE FOLLOW_UPS (relances)
-- =============================================

CREATE TABLE public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  type followup_type NOT NULL,
  status followup_status NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_follow_ups_client ON public.follow_ups(client_id);
CREATE INDEX idx_follow_ups_scheduled ON public.follow_ups(scheduled_at);
CREATE INDEX idx_follow_ups_status ON public.follow_ups(status);

-- =============================================
-- 11. TRIGGERS - Mise à jour automatique updated_at
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_persons_updated_at
  BEFORE UPDATE ON public.delivery_persons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 12. TRIGGER - Création automatique du profil
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Assigner le rôle par défaut "appelant"
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'appelant');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 13. TRIGGER - Génération numéro de commande
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  seq_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 5) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.orders
  WHERE order_number LIKE 'CMD-%';
  
  NEW.order_number := 'CMD-' || LPAD(seq_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION public.generate_order_number();

-- =============================================
-- 14. TRIGGER - Mise à jour stats client
-- =============================================

CREATE OR REPLACE FUNCTION public.update_client_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'delivered' AND NEW.status = 'delivered') THEN
    UPDATE public.clients
    SET 
      total_orders = total_orders + 1,
      total_spent = total_spent + NEW.amount_paid,
      segment = CASE
        WHEN total_orders + 1 >= 10 THEN 'vip'
        WHEN total_orders + 1 >= 3 THEN 'regular'
        ELSE segment
      END
    WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_client_stats_trigger
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'delivered')
  EXECUTE FUNCTION public.update_client_stats();

-- =============================================
-- 15. POLITIQUES RLS - PROFILES
-- =============================================

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins and supervisors can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrateur') OR 
    public.has_role(auth.uid(), 'superviseur')
  );

-- =============================================
-- 16. POLITIQUES RLS - USER_ROLES
-- =============================================

CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrateur'));

-- =============================================
-- 17. POLITIQUES RLS - CLIENTS
-- =============================================

CREATE POLICY "Authenticated users can view clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins and supervisors can update clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrateur') OR 
    public.has_role(auth.uid(), 'superviseur') OR
    created_by = auth.uid()
  );

CREATE POLICY "Admins can delete clients"
  ON public.clients FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrateur'));

-- =============================================
-- 18. POLITIQUES RLS - PRODUCTS
-- =============================================

CREATE POLICY "Authenticated users can view products"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrateur'));

-- =============================================
-- 19. POLITIQUES RLS - DELIVERY_PERSONS
-- =============================================

CREATE POLICY "Authenticated users can view delivery persons"
  ON public.delivery_persons FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Delivery persons can update own status"
  ON public.delivery_persons FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage delivery persons"
  ON public.delivery_persons FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrateur'));

-- =============================================
-- 20. POLITIQUES RLS - ORDERS
-- =============================================

CREATE POLICY "Authenticated users can view orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins supervisors and creators can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrateur') OR 
    public.has_role(auth.uid(), 'superviseur') OR
    created_by = auth.uid()
  );

CREATE POLICY "Delivery persons can update assigned orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    delivery_person_id IN (
      SELECT id FROM public.delivery_persons WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrateur'));

-- =============================================
-- 21. POLITIQUES RLS - PAYMENTS
-- =============================================

CREATE POLICY "Authenticated users can view payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins and supervisors can update payments"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrateur') OR 
    public.has_role(auth.uid(), 'superviseur')
  );

-- =============================================
-- 22. POLITIQUES RLS - FOLLOW_UPS
-- =============================================

CREATE POLICY "Authenticated users can view follow ups"
  ON public.follow_ups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create follow ups"
  ON public.follow_ups FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Creators and admins can update follow ups"
  ON public.follow_ups FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrateur') OR 
    public.has_role(auth.uid(), 'superviseur') OR
    created_by = auth.uid()
  );

CREATE POLICY "Admins can delete follow ups"
  ON public.follow_ups FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrateur'));