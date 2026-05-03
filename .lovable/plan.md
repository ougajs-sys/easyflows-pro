# Plan : Restaurer Messenger360 pour les notifications de travail

## Constat

Depuis l'intégration de ManyChat dans toutes les fonctions d'envoi, les notifications aux intervenants (livreurs, appelants, superviseurs) ne partent plus. Cause probable : ManyChat exige qu'un numéro soit déjà un "subscriber" actif (opt-in WhatsApp) avant d'envoyer un message hors-template, ce qui n'est pas le cas pour la plupart des collaborateurs internes. Les campagnes marketing, elles, fonctionnent car les destinataires deviennent abonnés automatiquement.

## Décision

- **Notifications internes (travail)** : repasser sur **Messenger360** (qui marchait avant).
- **Campagnes marketing WhatsApp** : **garder ManyChat** (badge vérifié = délivrabilité).

## Changements à faire

### 1. Restaurer Messenger360 dans les 3 fonctions de notification
Remplacer `sendViaManyChat` par `sendViaMessenger360` (ancienne implémentation déjà connue) dans :
- `supabase/functions/send-work-notification/index.ts` — notifications de travail aux livreurs/appelants/superviseurs
- `supabase/functions/send-notification-sms/index.ts` — notifications système
- `supabase/functions/send-sms/index.ts` — envoi SMS unitaire

Pour chacune :
- Re-ajouter la fonction `sendViaMessenger360` (POST vers `https://api.360messenger.com/v2/sendMessage`).
- Lire le secret `MESSENGER360_API_KEY` au lieu de `MANYCHAT_API_KEY`.
- Repasser le champ `provider` à `"messenger360"` dans les logs.
- Conserver la normalisation CIV existante et la déduplication 60s.

### 2. Garder ManyChat pour les campagnes
Aucun changement sur :
- `supabase/functions/send-campaign/index.ts`
- `supabase/functions/process-campaign-queue/index.ts`
- `supabase/functions/_shared/manychat.ts`

### 3. Vérifier le secret
- Confirmer que `MESSENGER360_API_KEY` est toujours présent dans les secrets Supabase. S'il a été supprimé, le redemander avant déploiement.

### 4. Mémoire projet
Mettre à jour la mémoire `mem://integrations/messaging-infrastructure-manychat-sms8` pour refléter la séparation :
- Messenger360 = notifications internes
- ManyChat = campagnes marketing uniquement

## Vérification après déploiement

- Déclencher une notification test (ex. assignation d'une commande à un livreur).
- Vérifier dans `work_notification_logs` que `provider = 'messenger360'` et `status = 'success'`.
- Confirmer qu'une campagne marketing passe toujours via ManyChat.
