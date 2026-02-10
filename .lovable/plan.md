
# Finalisation du Systeme de Notifications Push

## Probleme

La migration `20260209175145_pwa_push_notifications.sql` existe dans le code mais n'a jamais ete appliquee a la base de donnees. Les tables `user_push_tokens` et `push_log` n'existent pas, ce qui cause des erreurs de build TypeScript car le fichier `types.ts` ne contient pas ces tables.

## Solution

### 1. Creer une nouvelle migration pour les tables manquantes

Creer `supabase/migrations/20260210_create_push_tables.sql` avec :
- Table `user_push_tokens` (id, user_id, token, platform, is_enabled, last_seen_at, created_at)
- Table `push_log` (id, user_id, type, payload, status, created_at)
- Index et politiques RLS
- Fonction `send_push_notification` et triggers sur orders/messages

### 2. Mettre a jour les types Supabase

Ajouter dans `src/integrations/supabase/types.ts` les definitions TypeScript pour :
- `user_push_tokens` (Row, Insert, Update, Relationships)
- `push_log` (Row, Insert, Update, Relationships)

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `supabase/migrations/20260210_create_push_tables.sql` | Creer - Tables, RLS, triggers |
| `src/integrations/supabase/types.ts` | Modifier - Ajouter les types des 2 tables |

### Resultat attendu

- Les erreurs de build seront resolues
- Les tables seront creees en base de donnees
- Les notifications push pourront fonctionner (une fois Firebase configure)
- Les triggers enverront automatiquement des notifications lors de :
  - Nouvelle commande (admins/superviseurs)
  - Assignation appelant
  - Assignation livreur
  - Nouveau message chat
