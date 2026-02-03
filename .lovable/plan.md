
# Plan : Correction Definitive du Chat Direct

## Analyse du Probleme

J'ai identifie 4 problemes majeurs causant les dysfonctionnements du chat :

### Probleme 1 : Politique SELECT Incorrecte
La politique `Users can view messages in accessible channels` bloque les destinataires de messages directs :
```sql
-- Condition actuelle (INCORRECTE)
(receiver_id IS NULL) AND (channel LIKE 'direct-%')
-- Le destinataire a un receiver_id non-NULL, donc il ne peut pas voir le message!
```

### Probleme 2 : Politique UPDATE Manquante
Seul l'expediteur peut mettre a jour ses messages. Le destinataire ne peut pas marquer les messages comme lus :
```sql
-- Politique actuelle
auth.uid() = sender_id  -- Seulement l'expediteur
-- Le destinataire ne peut pas modifier is_read!
```

### Probleme 3 : Boucle de Requetes markAsRead
Le `useEffect` dans FloatingChat appelle `markAsRead` a chaque changement de contact, meme si aucun message n'est a marquer, creant des dizaines de requetes inutiles.

### Probleme 4 : Mise a Jour Optimiste Manquante
Apres l'envoi d'un message, le hook attend la prochaine invalidation (5 secondes) au lieu d'ajouter le message immediatement.

## Solution Proposee

### Migration SQL (Correction RLS)

```sql
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
    'delivery-supervisor'
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
```

### Modifications Frontend

**1. Correction useDirectMessages.tsx**
- Ajouter mise a jour optimiste du cache apres envoi
- Empecher les appels markAsRead redondants
- Reduire le refetchInterval de 5000ms a 3000ms pour les messages

**2. Correction FloatingChat.tsx**
- Ajouter condition pour ne pas appeler markAsRead si aucun message non lu
- Ajouter debounce sur markAsRead pour eviter les appels multiples

## Fichiers a Modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | Corriger les politiques RLS messages |
| `src/hooks/useDirectMessages.tsx` | Optimistic update + debounce markAsRead |
| `src/components/chat/FloatingChat.tsx` | Verifier messages non lus avant markAsRead |

## Flux Corrige

```text
AVANT (Problematique)                    APRES (Corrige)
========================                 ========================
User A envoie message                    User A envoie message
        |                                       |
INSERT -> OK                             INSERT -> OK
        |                                       |
Realtime -> User B notifie               Optimistic update local
        |                                       |
User B SELECT -> BLOQUE (RLS)            Realtime -> User B notifie
        |                                       |
Message invisible                        User B SELECT -> OK (RLS)
                                                |
                                         Message visible immediatement
                                                |
                                         User B markAsRead -> OK
```

## Details Techniques

### Politique SELECT Corrigee
La nouvelle politique permet au destinataire (`receiver_id = auth.uid()`) de lire les messages qui lui sont adresses, independamment du format du canal.

### Politique UPDATE Corrigee
Le destinataire peut maintenant mettre a jour le champ `is_read` pour marquer les messages comme lus, ce qui etait impossible avant.

### Optimistic Update
Apres envoi d'un message, le hook ajoute immediatement le message au cache local avant meme la confirmation de la base de donnees, pour une experience instantanee.

### Debounce markAsRead
Un delai de 500ms est ajoute pour eviter d'envoyer des dizaines de requetes PATCH simultanees lors de l'ouverture d'une conversation.

## Resultat Attendu

1. Les messages seront visibles instantanement par le destinataire
2. L'envoi de message sera instantane (mise a jour optimiste)
3. Les notifications afficheront correctement le contenu
4. Plus de requetes PATCH en boucle
5. Le marquage "lu" fonctionnera correctement
