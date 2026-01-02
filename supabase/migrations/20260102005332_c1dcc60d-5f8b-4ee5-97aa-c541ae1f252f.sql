-- Create role_requests table for role change requests
CREATE TABLE public.role_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  requested_role app_role NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own requests"
ON public.role_requests
FOR SELECT
USING (user_id = auth.uid());

-- Users can create requests for themselves
CREATE POLICY "Users can create own requests"
ON public.role_requests
FOR INSERT
WITH CHECK (user_id = auth.uid() AND requested_role IN ('livreur'::app_role, 'appelant'::app_role));

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON public.role_requests
FOR SELECT
USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'superviseur'::app_role));

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can update requests"
ON public.role_requests
FOR UPDATE
USING (has_role(auth.uid(), 'administrateur'::app_role));