-- Enhanced Row Level Security (RLS) Policies
-- This migration adds comprehensive RLS policies for user data isolation

-- Enable RLS on all tables if not already enabled
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
DROP POLICY IF EXISTS "Users can view own clients" ON clients;
DROP POLICY IF EXISTS "Users can create clients" ON clients;
DROP POLICY IF EXISTS "Users can update own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON clients;

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
ON profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- ORDERS TABLE POLICIES
-- ============================================================================

-- Policy: Users can view orders they created or are assigned to
CREATE POLICY "Users can view own orders"
ON orders
FOR SELECT
USING (
  auth.uid() = created_by
  OR auth.uid() = assigned_to
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'supervisor')
  )
);

-- Policy: Users can create orders
CREATE POLICY "Users can create orders"
ON orders
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update orders they created or are assigned to
CREATE POLICY "Users can update own orders"
ON orders
FOR UPDATE
USING (
  auth.uid() = created_by
  OR auth.uid() = assigned_to
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'supervisor')
  )
)
WITH CHECK (
  auth.uid() = created_by
  OR auth.uid() = assigned_to
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'supervisor')
  )
);

-- Policy: Only admins can delete orders
CREATE POLICY "Admins can delete orders"
ON orders
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- CLIENTS TABLE POLICIES
-- ============================================================================

-- Policy: Users can view clients they created or shared clients
CREATE POLICY "Users can view own clients"
ON clients
FOR SELECT
USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'supervisor')
  )
);

-- Policy: Users can create clients
CREATE POLICY "Users can create clients"
ON clients
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update clients they created
CREATE POLICY "Users can update own clients"
ON clients
FOR UPDATE
USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'supervisor')
  )
)
WITH CHECK (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'supervisor')
  )
);

-- Policy: Only admins can delete clients
CREATE POLICY "Admins can delete clients"
ON clients
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- PRODUCTS TABLE POLICIES
-- ============================================================================

-- Policy: All authenticated users can view products
CREATE POLICY "Authenticated users can view products"
ON products
FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy: Only admins and supervisors can create products
CREATE POLICY "Admins and supervisors can create products"
ON products
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'supervisor')
  )
);

-- Policy: Only admins and supervisors can update products
CREATE POLICY "Admins and supervisors can update products"
ON products
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'supervisor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'supervisor')
  )
);

-- Policy: Only admins can delete products
CREATE POLICY "Admins can delete products"
ON products
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- CAMPAIGNS TABLE POLICIES
-- ============================================================================

-- Policy: Users can view campaigns they created or all campaigns for admins
CREATE POLICY "Users can view own campaigns"
ON campaigns
FOR SELECT
USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'supervisor')
  )
);

-- Policy: Users can create campaigns
CREATE POLICY "Users can create campaigns"
ON campaigns
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update campaigns they created
CREATE POLICY "Users can update own campaigns"
ON campaigns
FOR UPDATE
USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'supervisor')
  )
)
WITH CHECK (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'supervisor')
  )
);

-- Policy: Only admins can delete campaigns
CREATE POLICY "Admins can delete campaigns"
ON campaigns
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

-- Policy: Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: System can create notifications for any user
CREATE POLICY "System can create notifications"
ON notifications
FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create indexes for commonly queried columns with RLS
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profiles with role-based access control';
COMMENT ON TABLE orders IS 'Orders with user-level isolation';
COMMENT ON TABLE clients IS 'Client contacts with user-level isolation';
COMMENT ON TABLE products IS 'Product catalog accessible to all authenticated users';
COMMENT ON TABLE campaigns IS 'Marketing campaigns with user-level isolation';
COMMENT ON TABLE notifications IS 'User-specific notifications';
