

# Correction complete du systeme de relances + workflow de validation

## Problemes actuels confirmes

- **176 relances zombies sur 197** : 111 pour des commandes annulees, 61 pour des commandes livrees, 4 pour des confirmees -- toutes encore "pending"
- **Pas de fermeture automatique** quand le statut de la commande change
- **Les appelants ne voient que leurs propres relances** (filtre `created_by = user.id`)
- **Pas de validation superviseur** ni de choix de l'appelant assigne

## Nouveau workflow demande

```text
Commande reportee/partielle
        |
        v
  Relance creee (statut: "awaiting_validation")
        |
        v
  Superviseur/Admin valide
  + choisit l'appelant assigne
        |
        v
  Relance active (statut: "pending")
  visible par l'appelant assigne
        |
        v
  Appelant traite la relance
        |
        v
  Relance completee/annulee
```

## Plan d'implementation

### Etape 1 : Migration de la base de donnees

**Ajouter des colonnes a `follow_ups` :**
- `assigned_to` (uuid, nullable) -- l'appelant assigne a cette relance
- `validated_by` (uuid, nullable) -- le superviseur qui a valide
- `validated_at` (timestamptz, nullable) -- date de validation

**Ajouter un nouveau statut** au type enum `followup_status` :
- Ajouter la valeur `awaiting_validation`

**Nettoyage des donnees :**
- Fermer les 176 relances zombies (commandes deja livrees/confirmees/annulees)

**Trigger SQL auto-fermeture :**
- Creer une fonction + trigger sur `orders` : quand le statut passe a "delivered", "confirmed" ou "cancelled", toutes les relances `pending` ou `awaiting_validation` associees sont marquees "completed" automatiquement (dans `follow_ups` ET `scheduled_followups`)

**Mettre a jour les politiques RLS :**
- Les appelants ne voient que les relances qui leur sont assignees (`assigned_to = auth.uid()`)
- Les superviseurs/admins voient toutes les relances
- Ajouter les droits INSERT pour les livreurs (car le report cree une relance)

### Etape 2 : Interface superviseur -- validation des relances

**Modifier `FollowUpsTable.tsx` (page /followups accessible aux superviseurs) :**
- Ajouter un filtre de statut "En attente de validation"
- Ajouter une colonne "Assigne a" dans le tableau
- Ajouter un bouton "Valider" qui ouvre un dialogue de validation

**Creer un dialogue de validation :**
- Liste deroulante des appelants disponibles (depuis `user_roles` + `profiles` ou `role = 'appelant'`)
- Bouton valider : met a jour `status = 'pending'`, `assigned_to`, `validated_by`, `validated_at`
- Possibilite de valider en lot (selection multiple)

**Modifier `FollowUpStats.tsx` :**
- Ajouter un compteur "A valider" pour les superviseurs

### Etape 3 : Interface appelant -- voir les relances assignees

**Modifier `CallerFollowUps.tsx` :**
- Remplacer le filtre `.eq("created_by", user.id)` par `.eq("assigned_to", user.id)`
- Ne montrer que les relances avec `status = 'pending'` (deja validees)
- Les relances "awaiting_validation" ne sont PAS visibles pour les appelants

### Etape 4 : Generation automatique corrigee

**Modifier `useFollowUps.tsx` > `generateAutoFollowUps` :**
- Les relances auto-generees sont creees avec `status = 'awaiting_validation'` au lieu de `'pending'`
- Pas de `assigned_to` a la creation (sera defini lors de la validation)
- Verification anti-doublon amelioree : verifier aussi les relances `awaiting_validation`

**Modifier le `ReportOrderDialog` (report par livreur/appelant) :**
- Les relances creees lors du report sont aussi en `awaiting_validation`

### Etape 5 : Notifications

- Quand une relance est creee (auto ou manuelle), notification au superviseur pour validation
- Quand une relance est validee et assignee, notification push a l'appelant concerne

## Details techniques

### Migration SQL

1. `ALTER TYPE followup_status ADD VALUE 'awaiting_validation'`
2. `ALTER TABLE follow_ups ADD COLUMN assigned_to uuid REFERENCES auth.users(id)`
3. `ALTER TABLE follow_ups ADD COLUMN validated_by uuid REFERENCES auth.users(id)`  
4. `ALTER TABLE follow_ups ADD COLUMN validated_at timestamptz`
5. Nettoyage : `UPDATE follow_ups SET status = 'completed', completed_at = now() WHERE status = 'pending' AND order_id IN (SELECT id FROM orders WHERE status IN ('delivered','confirmed','cancelled'))`
6. Trigger `auto_close_followups_on_order_update` sur la table `orders`
7. Mise a jour des politiques RLS sur `follow_ups` pour filtrer par `assigned_to`

### Fichiers modifies

- `src/hooks/useFollowUps.tsx` -- generation en `awaiting_validation`, anti-doublon
- `src/components/followups/FollowUpsTable.tsx` -- colonne "Assigne a", bouton valider, filtre
- `src/components/followups/FollowUpStats.tsx` -- compteur "A valider"
- `src/components/followups/FollowUpForm.tsx` -- creation en `awaiting_validation`
- `src/components/caller/CallerFollowUps.tsx` -- filtre par `assigned_to` au lieu de `created_by`
- `src/pages/FollowUps.tsx` -- ajout filtre "awaiting_validation"
- Nouveau : `src/components/followups/ValidateFollowUpDialog.tsx` -- dialogue de validation avec choix de l'appelant

### Aucun nouveau package necessaire

Toutes les dependances UI (Dialog, Select, Command) sont deja installees.

