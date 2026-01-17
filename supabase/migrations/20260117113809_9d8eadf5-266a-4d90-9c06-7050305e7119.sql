-- Add assigned_to column to orders for caller assignment
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON public.orders(assigned_to);

-- Create AI instructions table
CREATE TABLE IF NOT EXISTS public.ai_instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instruction text NOT NULL,
  instruction_type text NOT NULL DEFAULT 'custom',
  status text NOT NULL DEFAULT 'pending',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  executed_at timestamp with time zone,
  result jsonb,
  error_message text,
  affected_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create AI execution logs table
CREATE TABLE IF NOT EXISTS public.ai_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instruction_id uuid NOT NULL REFERENCES public.ai_instructions(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_execution_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_instructions
CREATE POLICY "Supervisors and admins can view all instructions"
ON public.ai_instructions FOR SELECT
USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'superviseur'::app_role));

CREATE POLICY "Supervisors and admins can create instructions"
ON public.ai_instructions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'superviseur'::app_role));

CREATE POLICY "Supervisors and admins can update instructions"
ON public.ai_instructions FOR UPDATE
USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'superviseur'::app_role));

-- RLS Policies for ai_execution_logs
CREATE POLICY "Supervisors and admins can view all logs"
ON public.ai_execution_logs FOR SELECT
USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'superviseur'::app_role));

CREATE POLICY "System can insert logs"
ON public.ai_execution_logs FOR INSERT
WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_instructions_created_by ON public.ai_instructions(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_instructions_status ON public.ai_instructions(status);
CREATE INDEX IF NOT EXISTS idx_ai_execution_logs_instruction ON public.ai_execution_logs(instruction_id);

-- Update trigger for ai_instructions
CREATE TRIGGER update_ai_instructions_updated_at
BEFORE UPDATE ON public.ai_instructions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();