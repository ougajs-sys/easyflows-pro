-- =============================================
-- CORRIGER LA POLITIQUE RLS POUR LES LIVREURS
-- =============================================
-- Probleme : Les livreurs ne peuvent pas annuler les commandes
-- car la politique actuelle verifie delivery_person_id apres la mise a jour.

-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Delivery persons can update assigned orders" ON public.orders;

-- Recreer avec WITH CHECK (true) pour permettre les annulations
-- USING : Seules les commandes assignees au livreur peuvent etre modifiees
-- WITH CHECK (true) : Accepte toutes les nouvelles valeurs
CREATE POLICY "Delivery persons can update assigned orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    delivery_person_id IN (
      SELECT id FROM public.delivery_persons WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (true);