

# Mise à jour de la clé API Messenger360

Le secret `MESSENGER360_API_KEY` existe déjà dans Supabase. Il suffit de le mettre à jour avec la nouvelle valeur `Ys5aA7tzY9N2oUFQqvh7TT1iRvqAjfEYqwv`.

## Action
- Mettre à jour le secret `MESSENGER360_API_KEY` avec la nouvelle clé API fournie
- Aucune modification de code necessaire -- l'Edge Function `send-work-notification` et `send-sms` utilisent deja ce secret

## Verification apres mise a jour
- Les prochaines notifications WhatsApp declenchees par un evenement (nouvelle commande, message, etc.) devraient fonctionner
- Verifiable dans les logs de la fonction `send-work-notification` ou dans la table `work_notification_logs`

