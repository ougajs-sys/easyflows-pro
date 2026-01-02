-- Ajouter une politique pour que les appelants puissent voir les clients
-- Les clients sans created_by (importés via webhook) doivent être visibles par les appelants

CREATE POLICY "Appelants can view all clients" 
ON public.clients 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'appelant'::app_role));