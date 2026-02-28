
1) Corriger la source du problème “groupes non sélectionnables” (limite Supabase 1000)
- Modifier `src/hooks/useClientSegments.tsx` pour paginer `clients` et `orders` (boucles `.range(...)`) au lieu de requêtes non paginées.
- Recalculer les segments (group, product, status, frequency) sur l’ensemble des données, pas uniquement les 1000 premières lignes.
- Résultat attendu: affichage des 6 groupes `Group-C-1 ... Group-C-6` avec comptes réels.

2) Corriger la résolution des destinataires (segments avancés mal appliqués)
- Modifier `src/hooks/useCampaigns.tsx` pour supprimer la whitelist actuelle `['new','regular','vip','inactive','problematic']` qui fait tomber certains segments en “all”.
- Gérer explicitement tous les IDs de segments utilisés par l’UI (`confirmed_paid`, `cancelled`, `reported`, `pending`, `inactive_30/60/90`, `frequent`, `occasional`, `lost`, `campaign_group:*`, `product:*`, `product_cancelled:*`).
- Appliquer la même logique côté planifié dans `supabase/functions/process-scheduled-campaigns/index.ts`.

3) Stabiliser l’exécution des campagnes (éviter les campagnes bloquées en “sending”)
- Déplacer l’orchestration lourde côté Edge (ne plus dépendre d’une boucle longue côté client).
- Réutiliser la logique de `process-scheduled-campaigns` pour traiter aussi les envois immédiats (ou via un endpoint dédié unique).
- Mettre à jour `campaigns.sent_count/failed_count/status` en continu par batch, puis finaliser systématiquement en `completed` ou `cancelled` (jamais bloqué en `sending` sans reprise).

4) Fiabiliser l’envoi SMS Côte d’Ivoire (+225) et les erreurs réelles
- Modifier `supabase/functions/send-sms/index.ts` et `supabase/functions/send-notification-sms/index.ts`:
  - normalisation stricte CI (préfixes valides: `01,05,07,21,22,23,24,25,27`);
  - rejet/trace explicite des numéros non valides dans `campaign_logs.error_message`;
  - conservation du délai anti-throttling + ajout retry/backoff sur 429 (si `Retry-After` présent).
  - journalisation détaillée du message retour provider (actuellement non visible dans les logs Edge).
- Résultat attendu: plus de “échec silencieux”, causes lisibles immédiatement.

5) Corriger les entrées UI qui induisent en erreur pays/format
- Modifier `src/components/sms/SmsTestPanel.tsx`:
  - placeholder `+225 ...` (supprimer `+212`);
  - validation en direct avec règles CI.
- Modifier `src/components/clients/ClientForm.tsx`:
  - placeholders adaptés CI;
  - validation téléphone CI (au lieu de simple `min(8)`).

6) Durcir la qualité des données contacts (prévention durable)
- Ajouter une migration SQL:
  - backfill `phone_normalized` pour les numéros CI valides;
  - rapport/listing des numéros invalides existants (52 détectés);
  - trigger de normalisation/validation sur insert/update pour empêcher de nouvelles données hors format CI.
- Option: définir `country_code='CI'` automatiquement quand validé.

7) Vérification finale (E2E)
- Test UI: `/campaigns` -> segmentation avancée -> sélectionner `Group-C-3` puis envoi test.
- Vérifier en base:
  - `campaigns`: `status=completed` et `sent_count + failed_count = total_recipients`;
  - `campaign_logs`: une ligne par destinataire traité avec `status/error_message`.
- Test SMS manuel:
  - numéro local CI (`07XXXXXXXX`) et format international (`+22507XXXXXXXX`);
  - confirmer résultat cohérent dans l’historique provider + logs Supabase.
