# Guide de Test - Système de Suivi des Recettes

## Prérequis

Avant de commencer les tests, assurez-vous que :
1. La migration de base de données a été appliquée (`20260127160000_revenue_tracking_system.sql`)
2. L'application est démarrée et accessible
3. Vous avez accès à au moins un compte appelant et un compte superviseur/administrateur

## Tests pour les Appelants

### Test 1 : Vérification du Widget de Recettes
**Objectif** : Vérifier que le widget de recettes s'affiche correctement dans le tableau de bord

**Étapes** :
1. Connectez-vous avec un compte appelant
2. Accédez au tableau de bord (`/dashboard`)
3. Vérifiez la présence du widget "Mes Recettes du Jour"

**Résultat attendu** :
- Le widget affiche "Total encaissé : 0 DH" (si aucun paiement)
- Le bouton "Verser mes recettes" est désactivé
- Un message "Aucune recette à verser pour le moment" est affiché

### Test 2 : Création Automatique de Recette lors d'un Paiement
**Objectif** : Vérifier que l'enregistrement d'un paiement crée automatiquement une recette

**Étapes** :
1. Créez une commande avec un montant (ex: 500 DH)
2. Enregistrez un paiement pour cette commande :
   - Montant : 500 DH
   - Méthode : Espèces (ou autre)
   - Statut : Complété
3. Retournez au tableau de bord
4. Vérifiez le widget "Mes Recettes du Jour"

**Résultat attendu** :
- Le total encaissé affiche 500 DH
- Le nombre de paiements est "1 paiement"
- Le bouton "Verser mes recettes" est maintenant actif

### Test 3 : Paiements Partiels
**Objectif** : Vérifier que plusieurs paiements partiels créent plusieurs recettes

**Étapes** :
1. Créez une commande avec un montant de 1000 DH
2. Enregistrez un premier paiement de 400 DH
3. Enregistrez un second paiement de 600 DH
4. Vérifiez le widget de recettes

**Résultat attendu** :
- Total encaissé : 1000 DH (somme des deux paiements)
- Nombre de paiements : 2 paiements

### Test 4 : Versement de Recettes
**Objectif** : Tester le processus de versement des recettes

**Étapes** :
1. Assurez-vous d'avoir au moins une recette encaissée
2. Cliquez sur "Verser mes recettes"
3. Dans le dialogue :
   - Vérifiez que le montant total est correct
   - Ajoutez une note (optionnel) : "Versement de fin de journée"
4. Cliquez sur "Confirmer le versement"

**Résultat attendu** :
- Message de succès : "Versement enregistré avec succès"
- Le dialogue se ferme
- Le widget affiche maintenant "Total encaissé : 0 DH"
- Le bouton est à nouveau désactivé

### Test 5 : Versement avec Plusieurs Paiements de Différentes Méthodes
**Objectif** : Vérifier que le versement inclut tous les paiements quelle que soit la méthode

**Étapes** :
1. Enregistrez plusieurs paiements avec différentes méthodes :
   - 300 DH en Espèces
   - 200 DH en Mobile Money
   - 150 DH par Carte
2. Vérifiez le widget : Total = 650 DH
3. Effectuez un versement
4. Vérifiez que toutes les recettes sont marquées comme versées

**Résultat attendu** :
- Le versement inclut tous les paiements (650 DH)
- Après versement, le total à verser est 0 DH

## Tests pour les Superviseurs/Administrateurs

### Test 6 : Accès à la Page de Suivi des Recettes
**Objectif** : Vérifier l'accès et l'affichage de la page de suivi

**Étapes** :
1. Connectez-vous avec un compte superviseur ou administrateur
2. Cliquez sur "Suivi Recettes" dans le menu latéral
3. Accédez à `/revenue-tracking`

**Résultat attendu** :
- La page s'affiche sans erreur
- Les cartes récapitulatives sont visibles
- Les tableaux sont affichés (même vides)

### Test 7 : Visualisation des Recettes par Appelant
**Objectif** : Vérifier que les recettes sont correctement affichées par appelant

**Prérequis** : Avoir effectué les tests 2-5 avec au moins un appelant

**Étapes** :
1. Accédez à la page "Suivi Recettes"
2. Consultez le tableau "Recettes par Appelant"
3. Vérifiez les informations de l'appelant

**Résultat attendu** :
- Nom et téléphone de l'appelant sont affichés
- Les totaux (encaissé, versé, à verser) correspondent aux opérations effectuées
- Le nombre de paiements est correct

### Test 8 : Détails des Recettes
**Objectif** : Vérifier le tableau détaillé des recettes

**Étapes** :
1. Faites défiler jusqu'au tableau "Filtres et Détails"
2. Vérifiez que toutes les recettes sont listées avec :
   - Date et heure
   - Appelant
   - Numéro de commande
   - Client
   - Méthode de paiement
   - Montant
   - Statut (Encaissé ou Versé)

**Résultat attendu** :
- Toutes les informations sont présentes et correctes
- Les recettes non versées ont le badge "Encaissé"
- Les recettes versées ont le badge "Versé"

### Test 9 : Filtrage par Statut
**Objectif** : Tester les filtres de la page

**Étapes** :
1. Sélectionnez "Encaissé" dans le filtre statut
2. Vérifiez que seules les recettes non versées sont affichées
3. Sélectionnez "Versé"
4. Vérifiez que seules les recettes versées sont affichées
5. Sélectionnez "Tous les statuts"

**Résultat attendu** :
- Le filtrage fonctionne correctement
- Les totaux en haut se mettent à jour selon le filtre

### Test 10 : Filtrage par Date
**Objectif** : Tester le filtrage par période

**Étapes** :
1. Sélectionnez une date de début (aujourd'hui)
2. Vérifiez que seules les recettes d'aujourd'hui sont affichées
3. Sélectionnez une date de fin (demain)
4. Ajoutez une date de début (hier)
5. Vérifiez que les recettes de la période sont affichées

**Résultat attendu** :
- Le filtrage par date fonctionne
- Les dates sont correctement prises en compte (sans problème de fuseau horaire)

### Test 11 : Temps Réel / Rafraîchissement
**Objectif** : Vérifier que les données se rafraîchissent automatiquement

**Étapes** :
1. Gardez la page "Suivi Recettes" ouverte
2. Dans un autre onglet ou navigateur :
   - Connectez-vous comme appelant
   - Enregistrez un nouveau paiement
3. Attendez 30 secondes maximum
4. Vérifiez la page "Suivi Recettes"

**Résultat attendu** :
- Les nouvelles recettes apparaissent automatiquement
- Les totaux sont mis à jour
- Pas besoin de rafraîchir manuellement la page

## Tests de Sécurité

### Test 12 : Isolation des Données par Appelant
**Objectif** : Vérifier que les appelants ne voient que leurs propres recettes

**Étapes** :
1. Créez deux comptes appelants (Appelant A et Appelant B)
2. Avec Appelant A, enregistrez un paiement
3. Connectez-vous avec Appelant B
4. Vérifiez le widget de recettes

**Résultat attendu** :
- Appelant B ne voit PAS les recettes de l'appelant A
- Chaque appelant voit uniquement ses propres recettes

### Test 13 : Accès Superviseur à Toutes les Recettes
**Objectif** : Vérifier que les superviseurs voient toutes les recettes

**Étapes** :
1. Avec plusieurs appelants, enregistrez plusieurs paiements
2. Connectez-vous comme superviseur
3. Accédez à "Suivi Recettes"

**Résultat attendu** :
- Le superviseur voit les recettes de TOUS les appelants
- Les filtres permettent de voir les recettes par appelant

## Tests de Régression

### Test 14 : Flux de Commandes et Paiements Existant
**Objectif** : S'assurer qu'il n'y a pas de régression sur le flux existant

**Étapes** :
1. Créez une commande normalement
2. Enregistrez un paiement
3. Vérifiez que la commande est mise à jour (amount_paid, status)
4. Vérifiez que le client est mis à jour (total_spent)

**Résultat attendu** :
- Tout fonctionne comme avant
- Le montant payé est correctement ajouté à la commande
- Le statut de la commande passe à "confirmé"
- Les statistiques du client sont mises à jour

### Test 15 : Paiements avec Statut Non-Complété
**Objectif** : Vérifier que seuls les paiements complétés créent des recettes

**Étapes** :
1. Si possible, créez un paiement avec statut "pending" ou "failed"
2. Vérifiez le widget de recettes

**Résultat attendu** :
- Aucune recette n'est créée pour les paiements non complétés
- Seuls les paiements avec statut "completed" créent des recettes

## Checklist Finale

Avant de considérer les tests comme terminés, vérifiez :

- [ ] Le widget s'affiche correctement pour les appelants
- [ ] Les paiements créent automatiquement des recettes
- [ ] Le versement fonctionne et met à jour les statuts
- [ ] Les superviseurs voient toutes les recettes
- [ ] Les filtres fonctionnent correctement
- [ ] Les données se rafraîchissent en temps réel
- [ ] L'isolation des données fonctionne (sécurité)
- [ ] Pas de régression sur le flux existant
- [ ] La construction (npm run build) réussit
- [ ] Le linter (npm run lint) ne rapporte pas d'erreurs pour les nouveaux fichiers

## Problèmes Connus et Solutions

### La recette n'est pas créée
**Cause possible** : Le paiement n'a pas le statut "completed" ou received_by est null
**Solution** : Vérifier que le paiement est bien enregistré avec status='completed' et un received_by valide

### Les totaux ne correspondent pas
**Cause possible** : Cache React Query
**Solution** : Les données se rafraîchissent toutes les 30s. Attendre ou rafraîchir la page.

### Erreur lors du versement
**Cause possible** : Aucune recette à verser
**Solution** : S'assurer d'avoir au moins une recette avec status='collected'

### Les filtres ne fonctionnent pas
**Cause possible** : Problème de fuseau horaire
**Solution** : Vérifier que les dates sont bien construites avec le composant temps (maintenant corrigé)
