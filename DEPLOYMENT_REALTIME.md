# Guide de déploiement - Suivi des recettes et Mode Live

Ce document décrit les étapes nécessaires pour activer le suivi des recettes et le mode Live (Realtime) dans l'environnement de production Supabase.

## Contexte

Le système de suivi des recettes permet aux appelants de :
- Voir leurs recettes collectées en temps réel
- Déclarer des versements de leurs recettes
- Suivre l'historique de leurs versements

Le mode Live utilise Supabase Realtime pour mettre à jour instantanément l'interface utilisateur lorsque :
- Une nouvelle commande est créée ou mise à jour
- Un paiement est enregistré
- Une recette est collectée ou versée

## Prérequis

- Accès administrateur au projet Supabase en production
- Migration `20260127160000_revenue_tracking_system.sql` disponible dans le dossier `supabase/migrations/`

## Étape 1 : Appliquer la migration Supabase

### Option A : Via Supabase Dashboard (recommandé)

1. Connectez-vous au [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet en production
3. Naviguez vers **Database** → **Migrations** dans le menu latéral
4. Cliquez sur **New migration**
5. Copiez le contenu du fichier `supabase/migrations/20260127160000_revenue_tracking_system.sql`
6. Collez le contenu dans l'éditeur
7. Nommez la migration : `revenue_tracking_system`
8. Cliquez sur **Run migration**
9. Vérifiez que la migration s'est exécutée sans erreur

### Option B : Via Supabase CLI

Si vous avez configuré la Supabase CLI avec votre projet :

```bash
# Assurez-vous d'être lié au bon projet
supabase link --project-ref <YOUR_PROJECT_REF>

# Appliquez la migration
supabase db push
```

### Vérification de la migration

Après l'application de la migration, vérifiez que les tables ont été créées :

1. Dans Supabase Dashboard, allez à **Database** → **Tables**
2. Vérifiez la présence des tables suivantes :
   - `collected_revenues`
   - `revenue_deposits`
3. Vérifiez également la présence des fonctions :
   - `create_collected_revenue_on_payment()`
   - `process_revenue_deposit()`
   - `get_caller_revenue_summary()`

## Étape 2 : Activer Supabase Realtime sur les tables

Pour que les mises à jour en temps réel fonctionnent, vous devez activer la publication Realtime sur les tables concernées.

### Tables à activer

Les tables suivantes doivent avoir Realtime activé :

1. `orders` (probablement déjà activé)
2. `payments` (probablement déjà activé)
3. `collected_revenues` (nouvelle table)
4. `revenue_deposits` (nouvelle table)

### Procédure d'activation

Pour chaque table :

1. Dans Supabase Dashboard, allez à **Database** → **Replication**
2. Sous **Publications**, trouvez la publication `supabase_realtime`
3. Vérifiez que les tables suivantes sont cochées :
   - `orders`
   - `payments`
   - `collected_revenues` ✅ (À activer)
   - `revenue_deposits` ✅ (À activer)
4. Si une table n'est pas cochée, cliquez sur **Add table to publication**
5. Sélectionnez la table et confirmez

### Alternative via SQL

Vous pouvez également activer Realtime via SQL dans l'éditeur SQL :

```sql
-- Activer Realtime sur collected_revenues
ALTER PUBLICATION supabase_realtime ADD TABLE collected_revenues;

-- Activer Realtime sur revenue_deposits
ALTER PUBLICATION supabase_realtime ADD TABLE revenue_deposits;

-- Vérifier les tables activées
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

## Étape 3 : Vérifier les politiques RLS

Les politiques Row Level Security (RLS) sont déjà définies dans la migration. Vérifiez qu'elles sont actives :

1. Dans Supabase Dashboard, allez à **Authentication** → **Policies**
2. Sélectionnez la table `collected_revenues`
3. Vérifiez la présence des politiques :
   - `Callers can view own collected revenues`
   - `Callers can insert own collected revenues`
   - `Callers can update own collected revenues`
4. Sélectionnez la table `revenue_deposits`
5. Vérifiez la présence des politiques :
   - `Users can view own deposits, supervisors view all`
   - `Callers can create own deposits`

## Étape 4 : Tester en production

### Test 1 : Création d'un paiement

1. Connectez-vous en tant qu'appelant
2. Créez une commande et enregistrez un paiement
3. Vérifiez que :
   - Le paiement apparaît dans la table `payments`
   - Une entrée automatique est créée dans `collected_revenues`
   - La section "Mes Recettes du Jour" affiche le montant collecté

### Test 2 : Versement de recettes

1. En tant qu'appelant avec des recettes collectées
2. Cliquez sur "Verser mes recettes"
3. Confirmez le versement
4. Vérifiez que :
   - Une entrée est créée dans `revenue_deposits`
   - Les entrées dans `collected_revenues` passent au statut `deposited`
   - Le montant "à verser" revient à 0

### Test 3 : Mises à jour en temps réel

1. Ouvrez deux onglets du navigateur
2. Connectez-vous en tant qu'appelant dans les deux onglets
3. Dans le premier onglet, créez une nouvelle commande
4. Vérifiez que les KPI se mettent à jour automatiquement dans le deuxième onglet sans rafraîchissement
5. Enregistrez un paiement et vérifiez que "Mes Recettes du Jour" se met à jour instantanément

### Test 4 : Robustesse en cas d'erreur

Pour vérifier que l'UI ne se casse pas si les tables n'existent pas (avant migration) :

1. Temporairement, renommez une table via SQL :
   ```sql
   ALTER TABLE collected_revenues RENAME TO collected_revenues_backup;
   ```
2. Rechargez le tableau de bord appelant
3. Vérifiez que :
   - L'interface ne se bloque pas
   - Un message informatif s'affiche : "Fonctionnalité en cours de déploiement"
   - Les autres KPI continuent de fonctionner
4. Restaurez la table :
   ```sql
   ALTER TABLE collected_revenues_backup RENAME TO collected_revenues;
   ```

## Étape 5 : Surveillance post-déploiement

### Logs à surveiller

1. Dans Supabase Dashboard → **Logs** → **Database**
   - Vérifiez qu'il n'y a pas d'erreurs liées aux triggers
   - Cherchez les entrées liées à `create_collected_revenue_on_payment`

2. Dans la console navigateur (F12) :
   - Vérifiez les messages de connexion Realtime :
     ```
     Setting up Realtime subscriptions for revenue tracking...
     Collected revenues channel status: SUBSCRIBED
     Revenue deposits channel status: SUBSCRIBED
     ```
   - Vérifiez qu'il n'y a pas d'erreurs 404 sur les endpoints REST

### Métriques à surveiller

- Nombre de collected_revenues créées = nombre de paiements complétés
- Performance des requêtes sur `get_caller_revenue_summary()`
- Latence des mises à jour Realtime (devrait être < 1 seconde)

## Rollback en cas de problème

Si vous rencontrez des problèmes critiques après le déploiement :

### Option 1 : Désactiver Realtime temporairement

```sql
-- Retirer les tables de la publication Realtime
ALTER PUBLICATION supabase_realtime DROP TABLE collected_revenues;
ALTER PUBLICATION supabase_realtime DROP TABLE revenue_deposits;
```

Le système continuera de fonctionner avec le polling (rafraîchissement toutes les 30 secondes).

### Option 2 : Rollback complet de la migration

⚠️ **Attention** : Cela supprimera toutes les données de recettes !

```sql
-- Supprimer les tables et fonctions
DROP TRIGGER IF EXISTS trigger_create_collected_revenue ON public.payments;
DROP FUNCTION IF EXISTS public.create_collected_revenue_on_payment();
DROP FUNCTION IF EXISTS public.process_revenue_deposit(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_caller_revenue_summary(UUID, TIMESTAMPTZ, TIMESTAMPTZ);
DROP TABLE IF EXISTS public.collected_revenues;
DROP TABLE IF EXISTS public.revenue_deposits;
DROP TYPE IF EXISTS public.revenue_status;
```

L'application continuera de fonctionner normalement sans la fonctionnalité de suivi des recettes.

## Checklist de déploiement

Utilisez cette checklist pour vous assurer que toutes les étapes sont complétées :

- [ ] Migration `20260127160000_revenue_tracking_system.sql` appliquée avec succès
- [ ] Tables `collected_revenues` et `revenue_deposits` créées
- [ ] Fonctions PL/pgSQL créées et testées
- [ ] Realtime activé sur `collected_revenues`
- [ ] Realtime activé sur `revenue_deposits`
- [ ] Realtime activé sur `orders` (si pas déjà fait)
- [ ] Realtime activé sur `payments` (si pas déjà fait)
- [ ] Politiques RLS vérifiées et actives
- [ ] Test de création de paiement → collected_revenue automatique
- [ ] Test de versement de recettes
- [ ] Test de mises à jour Realtime (multi-onglets)
- [ ] Test de robustesse (UI ne casse pas en cas d'erreur)
- [ ] Vérification des logs Supabase (pas d'erreurs)
- [ ] Vérification console navigateur (pas d'erreurs 404)
- [ ] Documentation partagée avec l'équipe

## Support

En cas de problème ou de question :

1. Vérifiez les logs Supabase Dashboard → Logs
2. Vérifiez la console navigateur (F12) pour les erreurs JS
3. Consultez la documentation Supabase Realtime : https://supabase.com/docs/guides/realtime
4. Contactez l'équipe technique avec les logs d'erreur

## Références

- Migration SQL : `supabase/migrations/20260127160000_revenue_tracking_system.sql`
- Hook React : `src/hooks/useCollectedRevenues.tsx`
- Composant UI : `src/components/caller/CallerRevenueSummary.tsx`
- Dashboard : `src/components/caller/CallerDashboard.tsx`
- Documentation Supabase Realtime : https://supabase.com/docs/guides/realtime
