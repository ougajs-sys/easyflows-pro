-- Fix security for clients table
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;

-- Create more restrictive policies
CREATE POLICY "Admins and supervisors can view all clients" 
ON public.clients 
FOR SELECT 
USING (
  has_role(auth.uid(), 'administrateur'::app_role) OR 
  has_role(auth.uid(), 'superviseur'::app_role)
);

CREATE POLICY "Users can view clients they created" 
ON public.clients 
FOR SELECT 
USING (created_by = auth.uid());

-- Fix security for delivery_persons table
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view delivery persons" ON public.delivery_persons;

-- Create more restrictive policies
CREATE POLICY "Admins and supervisors can view all delivery persons" 
ON public.delivery_persons 
FOR SELECT 
USING (
  has_role(auth.uid(), 'administrateur'::app_role) OR 
  has_role(auth.uid(), 'superviseur'::app_role)
);

CREATE POLICY "Delivery persons can view own record" 
ON public.delivery_persons 
FOR SELECT 
USING (user_id = auth.uid());