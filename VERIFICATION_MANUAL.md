# Vérification manuelle des corrections

Ce document décrit comment vérifier manuellement que les corrections apportées fonctionnent correctement.

## Changements apportés

### 1. Gestion robuste des erreurs

Les modifications suivantes ont été apportées pour empêcher le blocage du tableau de bord :

#### `src/hooks/useCollectedRevenues.tsx`
- ✅ Gestion des erreurs 404 (table non trouvée) pour `collected_revenues`
- ✅ Gestion des erreurs 404 pour `revenue_deposits`
- ✅ Gestion des erreurs sur le RPC `get_caller_revenue_summary`
- ✅ Retour de valeurs par défaut ([], 0) au lieu de crasher
- ✅ Configuration de retry pour ne pas retenter si table inexistante
- ✅ Ajout du hook `useRealtimeRevenues()` pour les abonnements Realtime

#### `src/components/caller/CallerDashboard.tsx`
- ✅ Ajout de gestion d'erreur dans la query des statistiques
- ✅ Affichage d'un message clair si erreur au lieu de bloquer
- ✅ Ajout d'abonnements Realtime pour les commandes de l'appelant

#### `src/components/caller/CallerRevenueSummary.tsx`
- ✅ Affichage d'un message informatif si les données sont indisponibles
- ✅ Intégration du hook `useRealtimeRevenues()` pour updates live

### 2. Mode Live via Supabase Realtime

#### Hook `useRealtimeRevenues()`
- Écoute les changements sur `collected_revenues` (INSERT/UPDATE/DELETE)
- Écoute les changements sur `revenue_deposits` (INSERT/UPDATE/DELETE)
- Écoute les nouveaux paiements qui créent des recettes collectées
- Filtre par utilisateur connecté (sécurité RLS)
- Invalide automatiquement les queries React Query

#### CallerDashboard Realtime
- Écoute les changements sur les commandes de l'appelant
- Met à jour les KPI instantanément

## Scénarios de test

### Scénario 1 : Tables non déployées (avant migration)

**Objectif** : Vérifier que l'UI ne se bloque pas si les tables `collected_revenues` et `revenue_deposits` n'existent pas.

**Résultat attendu** :
- ✅ Le tableau de bord "Mon Espace" se charge normalement
- ✅ Les statistiques de commandes (total, confirmées, etc.) s'affichent
- ✅ La section "Mes Recettes du Jour" affiche un message : "Fonctionnalité en cours de déploiement"
- ✅ Aucune erreur dans la console (juste des warnings)
- ✅ Aucun loader bloqué indéfiniment

**Comment tester (en dev)** :
1. Ouvrir la console navigateur (F12)
2. Observer les messages de warning : "Table collected_revenues not found. Please apply migration."
3. Vérifier que le dashboard s'affiche quand même

### Scénario 2 : Tables déployées, Realtime non activé

**Objectif** : Vérifier que le système fonctionne avec polling même si Realtime n'est pas activé.

**Résultat attendu** :
- ✅ Le tableau de bord se charge normalement
- ✅ Les recettes s'affichent correctement
- ✅ Les KPI se mettent à jour toutes les 30 secondes (polling)
- ✅ Les abonnements Realtime échouent silencieusement (console log)

### Scénario 3 : Tables déployées, Realtime activé (mode Live complet)

**Objectif** : Vérifier que les mises à jour en temps réel fonctionnent.

**Test 1 - Mise à jour des recettes** :
1. Ouvrir deux onglets avec le même utilisateur appelant
2. Dans l'onglet 1, créer une commande et enregistrer un paiement
3. Dans l'onglet 2, observer que "Mes Recettes du Jour" se met à jour instantanément
4. Vérifier dans la console : "Collected revenue change: ..." et "New payment received: ..."

**Test 2 - Mise à jour des statistiques** :
1. Ouvrir deux onglets avec le même utilisateur appelant
2. Dans l'onglet 1, créer une nouvelle commande
3. Dans l'onglet 2, observer que le KPI "Reçues" s'incrémente instantanément
4. Vérifier dans la console : "Order change for caller: ..."

**Test 3 - Versement de recettes** :
1. Avec des recettes collectées, cliquer sur "Verser mes recettes"
2. Confirmer le versement
3. Observer que le montant "à verser" passe instantanément à 0
4. Vérifier dans la console : "Revenue deposit change: ..."

### Scénario 4 : Erreur réseau ou Supabase indisponible

**Objectif** : Vérifier que l'UI reste utilisable même en cas d'erreur réseau.

**Résultat attendu** :
- ✅ Affichage d'un message "Données indisponibles"
- ✅ Pas de crash de l'application
- ✅ Les autres sections continuent de fonctionner

## Messages console à surveiller

### Lors du chargement initial
```
Setting up Realtime subscriptions for revenue tracking...
Collected revenues channel status: SUBSCRIBED
Revenue deposits channel status: SUBSCRIBED
Payments channel status: SUBSCRIBED
Setting up Realtime subscriptions for caller dashboard...
Caller orders channel status: SUBSCRIBED
```

### Lors d'un événement Realtime
```
Collected revenue change: { eventType: 'INSERT', new: {...}, old: null }
Order change for caller: { eventType: 'UPDATE', new: {...}, old: {...} }
New payment received: { eventType: 'INSERT', new: {...}, old: null }
Revenue deposit change: { eventType: 'INSERT', new: {...}, old: null }
```

### Si les tables n'existent pas
```
Table collected_revenues not found. Please apply migration.
Table revenue_deposits not found. Please apply migration.
Revenue tracking not available. Please apply migration.
```

## Vérification du code

### Points clés vérifiés

1. **Gestion d'erreur dans useCollectedRevenues** :
   - `error.code === 'PGRST116'` : code d'erreur PostgREST pour "relation does not exist"
   - `error.code === '42883'` : code PostgreSQL pour "function does not exist"
   - `error.message?.includes('does not exist')` : fallback texte
   - `retry: false` si erreur de table inexistante

2. **Valeurs de repli** :
   - Retour de `[]` pour les listes
   - Retour de `{ total_collected: 0, ... }` pour les résumés
   - Pas de `throw error` si table inexistante

3. **Abonnements Realtime** :
   - Filtrage par utilisateur : `filter: 'collected_by=eq.${user.id}'`
   - Invalidation de queries : `queryClient.invalidateQueries({ queryKey: [...] })`
   - Cleanup : `supabase.removeChannel(channel)` dans `return () => {...}`

4. **Messages utilisateur** :
   - CallerDashboard : "Données indisponibles" avec explication
   - CallerRevenueSummary : "Fonctionnalité en cours de déploiement"

## Checklist de vérification manuelle

- [ ] Build réussi (`npm run build`)
- [ ] Pas de nouvelles erreurs ESLint
- [ ] Console sans erreurs 404 bloquantes (seulement warnings)
- [ ] Dashboard appelant se charge même sans tables revenue
- [ ] Message informatif affiché au lieu du loader bloqué
- [ ] Abonnements Realtime configurés (voir console logs)
- [ ] Invalidation des queries lors d'événements Realtime
- [ ] Documentation de déploiement complète (DEPLOYMENT_REALTIME.md)

## Prochaines étapes

1. ✅ Merge du PR
2. ⏳ Déploiement en production (suivre DEPLOYMENT_REALTIME.md)
3. ⏳ Application de la migration en production
4. ⏳ Activation de Realtime sur les tables
5. ⏳ Tests en production

## Notes importantes

- Le système continue de fonctionner avec polling (30s) si Realtime n'est pas disponible
- Les erreurs sont loguées dans la console mais n'empêchent pas le fonctionnement
- La sécurité RLS est respectée : chaque utilisateur voit uniquement ses propres données
- Les superviseurs/admins voient toutes les données (selon politiques RLS)
