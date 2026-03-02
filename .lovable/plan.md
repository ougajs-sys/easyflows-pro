

# Notifications metier WhatsApp obligatoires via Messenger360

## Principe

Chaque evenement metier important envoie automatiquement un WhatsApp au(x) concerne(s) via Messenger360. WhatsApp active par defaut pour tous, pas de preference a gerer. Les triggers SQL existants (`orders_push_notify`, `messages_push_notify`) seront modifies pour appeler la nouvelle Edge Function `send-work-notification` en plus du push FCM actuel.

## Implementation

### 1. Migration SQL

- Creer table `work_notification_logs` (id, event_type, recipient_user_id, recipient_phone, message, link, status, error_message, provider, created_at)
- RLS: insert via service role (true), select pour admins/superviseurs + propres logs
- Modifier `orders_push_notify()` pour ajouter un appel a `send-work-notification` (via `http_post_with_service_role`) apres chaque cas (nouvelle commande, assignation livreur, assignation appelant, changement statut)
- Modifier `messages_push_notify()` pour ajouter un appel a `send-work-notification` pour les DMs
- Ajouter trigger sur `revenue_deposits` (INSERT) pour notifier superviseurs/admins
- Ajouter trigger sur `stock_movements` ou `delivery_person_stock` (UPDATE) pour notifier le livreur concerne

### 2. Edge Function `send-work-notification`

Nouvelle fonction qui :
- Recoit `{ event_type, title, body, target_user_ids, link }`
- Pour chaque user_id : recupere `phone` depuis `profiles`
- Normalise le numero CI, envoie via Messenger360 WhatsApp
- Log dans `work_notification_logs`
- Protection anti-spam : deduplication 60s (meme event_type + meme user_id)
- `verify_jwt = false` (appele par SQL trigger)

Format du message WhatsApp :
```
EasyFlows: Commande CMD-000123 assignee.
Client: Jean Dupont
Consultez: https://easyflows-pro.lovable.app/caller
```

### 3. Config

- Ajouter `[functions.send-work-notification]` avec `verify_jwt = false` dans `supabase/config.toml`

### 4. Evenements couverts

| Evenement | Destinataires | Lien |
|---|---|---|
| Nouvelle commande | Admins + Superviseurs | /orders |
| Assignation appelant | L'appelant | /caller |
| Assignation livreur | Le livreur | /delivery |
| Changement statut commande | Createur + Admin | /orders |
| Nouveau message DM | Destinataire | /chat |
| Versement en attente | Superviseurs + Admins | /supervisor |

### Fichiers concernes

- **Creer** : `supabase/functions/send-work-notification/index.ts`
- **Modifier** : `supabase/config.toml` (ajouter la fonction)
- **Migration SQL** : table `work_notification_logs` + triggers modifies

### Section technique

- Les triggers existants appellent deja `http_post_with_service_role` avec des arguments positionnels (url, body) -- on reutilise le meme pattern
- Messenger360 utilise le format `225XXXXXXXXXX` (sans `+`) -- deja gere par `normalizeCIPhone`
- Le secret `MESSENGER360_API_KEY` est deja configure dans les fonctions existantes
- La deduplication se fait par query sur `work_notification_logs` (meme event_type + recipient + < 60s)

