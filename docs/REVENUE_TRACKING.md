# Système de Suivi des Recettes et Versements

## Vue d'ensemble

Ce système permet de suivre les recettes encaissées par les appelants lors de l'enregistrement de paiements sur les commandes, et de gérer les versements de ces recettes.

## Fonctionnalités

### Pour les Appelants

#### 1. Suivi des Recettes Encaissées
- Chaque paiement enregistré crée automatiquement une recette encaissée
- Affichage en temps réel du total encaissé du jour
- Affichage du total à verser (recettes non encore versées)

#### 2. Versement des Recettes
- Bouton "Verser mes recettes" dans le tableau de bord
- Dialogue de confirmation avec récapitulatif du montant total
- Possibilité d'ajouter des notes lors du versement
- Toutes les recettes encaissées sont marquées comme "versées" lors de l'opération

### Pour les Superviseurs et Administrateurs

#### 1. Vue d'Ensemble des Recettes
- Total des recettes (encaissées + versées)
- Total encaissé (recettes non encore versées)
- Total versé
- Nombre d'appelants actifs

#### 2. Recettes par Appelant
- Tableau récapitulatif par appelant montrant :
  - Nom et téléphone de l'appelant
  - Total encaissé
  - Total versé
  - Total à verser
  - Nombre de paiements

#### 3. Détails des Recettes
- Filtres disponibles :
  - Par statut (encaissé / versé)
  - Par date (début et fin)
  - Par appelant
- Tableau détaillé avec :
  - Date et heure de l'encaissement
  - Appelant
  - Numéro de commande
  - Client
  - Méthode de paiement
  - Montant
  - Statut

## Architecture Technique

### Base de Données

#### Table `collected_revenues`
Stocke chaque recette encaissée liée à un paiement.

```sql
- id (UUID)
- payment_id (UUID) → payments.id
- order_id (UUID) → orders.id
- amount (DECIMAL)
- payment_method (ENUM)
- collected_by (UUID) → auth.users.id
- status (ENUM: 'collected' | 'deposited')
- deposit_id (UUID) → revenue_deposits.id (nullable)
- collected_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
```

#### Table `revenue_deposits`
Stocke les opérations de versement effectuées par les appelants.

```sql
- id (UUID)
- deposited_by (UUID) → auth.users.id
- total_amount (DECIMAL)
- revenue_count (INTEGER)
- notes (TEXT, nullable)
- deposited_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
```

### Déclencheurs (Triggers)

#### `trigger_create_collected_revenue`
- Se déclenche automatiquement après l'insertion d'un paiement
- Crée une recette encaissée si le paiement est complété
- Associe la recette à l'utilisateur qui a enregistré le paiement

### Fonctions Stockées

#### `process_revenue_deposit(p_user_id UUID, p_notes TEXT)`
- Crée un enregistrement de versement
- Marque toutes les recettes encaissées non versées comme "versées"
- Retourne le résumé du versement (ID, montant total, nombre de recettes)

#### `get_caller_revenue_summary(p_user_id UUID, p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ)`
- Retourne un résumé des recettes pour un appelant
- Paramètres de date optionnels pour filtrer la période
- Retourne : total encaissé, total versé, total à verser, compteurs

### Hooks React

#### `useCollectedRevenues()`
Hook pour les appelants pour gérer leurs recettes.

```typescript
const {
  revenues,           // Toutes les recettes
  todayRevenues,      // Recettes du jour uniquement
  summary,            // Résumé (totaux et compteurs)
  processDeposit,     // Mutation pour effectuer un versement
  deposits,           // Historique des versements
} = useCollectedRevenues();
```

#### `useSupervisorRevenues(filters)`
Hook pour les superviseurs/admins pour voir toutes les recettes.

```typescript
const {
  allRevenues,        // Toutes les recettes avec détails
  allDeposits,        // Tous les versements
  revenueByCallers,   // Statistiques par appelant
} = useSupervisorRevenues({
  status: 'collected',
  startDate: new Date(),
  endDate: new Date(),
  callerId: 'uuid',
});
```

## Composants UI

### `CallerRevenueSummary`
Widget affiché dans le tableau de bord de l'appelant.
- Carte montrant le total encaissé du jour
- Bouton "Verser mes recettes"
- Dialogue de confirmation de versement

### `SupervisorRevenueTracking`
Page complète pour superviseurs/admins.
- Cartes récapitulatives (totaux)
- Tableau des recettes par appelant
- Filtres et tableau détaillé des recettes

## Flux de Données

### 1. Enregistrement d'un Paiement
```
Appelant enregistre un paiement
    ↓
Insertion dans table `payments`
    ↓
Trigger `trigger_create_collected_revenue`
    ↓
Création automatique dans `collected_revenues`
    ↓
Statut = 'collected'
```

### 2. Versement des Recettes
```
Appelant clique "Verser mes recettes"
    ↓
Dialogue de confirmation
    ↓
Appel de `processDeposit.mutateAsync()`
    ↓
Fonction `process_revenue_deposit()` exécutée
    ↓
Création dans `revenue_deposits`
    ↓
Mise à jour de toutes les recettes encaissées :
  - status → 'deposited'
  - deposit_id → [nouvel ID de versement]
    ↓
Invalidation des queries React Query
    ↓
Rafraîchissement automatique de l'UI
```

## Sécurité (RLS)

### Politiques sur `collected_revenues`
- **SELECT** : Les appelants voient leurs propres recettes, superviseurs/admins voient tout
- **INSERT** : Seulement les appelants, superviseurs et admins
- **UPDATE** : Seulement pour marquer comme versé (via la fonction stockée)

### Politiques sur `revenue_deposits`
- **SELECT** : Les utilisateurs voient leurs propres versements, superviseurs/admins voient tout
- **INSERT** : Seulement les appelants (leurs propres versements)

## Navigation

- **Appelants** : Voir le widget dans le tableau de bord (`/dashboard`)
- **Superviseurs/Admins** : Menu "Suivi Recettes" → `/revenue-tracking`

## Tests Recommandés

1. **Test du flux de paiement → recette** :
   - Créer une commande
   - Enregistrer un paiement
   - Vérifier qu'une recette est créée automatiquement

2. **Test du versement** :
   - S'assurer d'avoir des recettes encaissées
   - Cliquer sur "Verser mes recettes"
   - Vérifier que le statut passe à "versé"
   - Vérifier qu'un enregistrement de versement est créé

3. **Test de la vue superviseur** :
   - Vérifier que les totaux sont corrects
   - Tester les filtres (date, statut, appelant)
   - Vérifier que les données sont mises à jour en temps réel

## Migration

Le fichier de migration `20260127160000_revenue_tracking_system.sql` contient :
- Création des types ENUM
- Création des tables
- Création des index
- Mise en place des politiques RLS
- Création des triggers
- Création des fonctions stockées

Pour appliquer la migration sur un environnement Supabase :
```bash
supabase db push
```

## Notes Importantes

1. **Temps Réel** : Les données sont rafraîchies automatiquement toutes les 30 secondes via React Query
2. **Atomicité** : Le versement est une opération atomique (tout ou rien)
3. **Audit Trail** : Toutes les opérations sont horodatées et liées aux utilisateurs
4. **Performance** : Les index sont créés sur les colonnes fréquemment utilisées dans les filtres
