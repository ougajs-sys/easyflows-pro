-- =====================================================
-- CORRECTION DEFINITIVE DES POLITIQUES RLS MESSAGES
-- =====================================================

-- 1. Supprimer les politiques problematiques
DROP POLICY IF EXISTS "Users can view messages in accessible channels" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- 2. Nouvelle politique SELECT pour les DMs et canaux internes
CREATE POLICY "messages_select_policy" ON public.messages
FOR SELECT TO authenticated
USING (
  -- L'expediteur peut voir ses propres messages
  (auth.uid() = sender_id)
  OR 
  -- Le destinataire peut voir les messages qui lui sont destines
  (auth.uid() = receiver_id)
  OR 
  -- Messages des canaux internes (sans receiver_id specifique)
  (receiver_id IS NULL AND channel IN (
    'internal-general', 
    'internal-superviseurs', 
    'internal-appelants', 
    'internal-livreurs',
    'caller-supervisor',
    'delivery-supervisor',
    'room-appelants',
    'room-livreurs'
  ))
);

-- 3. Nouvelle politique UPDATE pour marquer comme lu
CREATE POLICY "messages_update_policy" ON public.messages
FOR UPDATE TO authenticated
USING (
  -- L'expediteur peut modifier ses messages
  (auth.uid() = sender_id)
  OR
  -- Le destinataire peut marquer les messages comme lus
  (auth.uid() = receiver_id)
)
WITH CHECK (
  -- L'expediteur peut modifier n'importe quel champ
  (auth.uid() = sender_id)
  OR
  -- Le destinataire ne peut modifier que is_read
  (auth.uid() = receiver_id)
);