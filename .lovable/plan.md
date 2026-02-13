

# Recherche globale precise avec fiche detaillee

## Probleme actuel

La recherche globale redirige vers les pages de liste (`/orders`, `/clients`, `/roles`) sans filtrer ni ouvrir la fiche specifique du resultat clique. Les resultats affichent tres peu d'informations.

## Solution

Transformer la recherche globale pour qu'elle affiche des resultats riches directement dans le dropdown, et qu'un clic ouvre une **fiche detaillee** (Dialog) avec toutes les informations pertinentes : client, appelant qui a traite l'appel, livreur assigne, produit, statut, montants, historique.

## Changements prevus

### 1. Enrichir les donnees de recherche (GlobalSearch.tsx)

**Commandes** -- Recuperer plus de champs :
- Client : nom, telephone, ville, zone
- Produit : nom, prix
- Appelant (created_by) : nom via profiles
- Livreur (delivery_person_id) : nom via delivery_persons + profiles
- Montant paye, montant du, adresse de livraison, notes de livraison, date de creation

**Clients** -- Recuperer aussi :
- Segment, adresse, notes, total_orders, total_spent, telephone secondaire

### 2. Afficher des resultats plus detailles dans le dropdown

Chaque resultat de commande affichera :
- Numero de commande + statut (badge colore)
- Nom du client + telephone
- Nom de l'appelant qui a cree la commande
- Nom du livreur assigne
- Montant total + montant paye

Chaque resultat client affichera :
- Nom + telephones
- Ville/Zone + segment (badge)
- Nombre de commandes + total depense

### 3. Creer un composant SearchResultDetail (nouvelle Dialog)

Quand l'utilisateur clique sur un resultat :

**Pour une commande** -- Dialog avec :
- En-tete : numero de commande + statut
- Section Client : nom, telephones, ville, zone, adresse
- Section Commande : produit, quantite, prix unitaire, montant total, montant paye, montant du
- Section Appelant : nom de celui qui a cree la commande
- Section Livreur : nom du livreur assigne + statut
- Section Livraison : adresse, notes
- Dates : creation, livraison

**Pour un client** -- Dialog avec :
- Info client complete : nom, telephones, ville, zone, adresse, notes, segment
- Stats : total commandes, total depense
- Liste des dernieres commandes avec statut, montant, appelant, livreur

### 4. Fichiers concernes

- `src/components/layout/GlobalSearch.tsx` -- Refonte de la recherche et des resultats
- `src/components/layout/SearchResultDetail.tsx` -- Nouveau composant Dialog pour afficher la fiche detaillee

### 5. Pas de migration SQL necessaire

Toutes les donnees existent deja dans les tables `orders`, `clients`, `profiles`, `delivery_persons` et `products`. Il suffit d'enrichir les requetes SELECT.

## Details techniques

### Requete enrichie pour les commandes
```text
orders -> select:
  id, order_number, status, total_amount, amount_paid, amount_due,
  quantity, unit_price, delivery_address, delivery_notes, created_at,
  client:clients(full_name, phone, phone_secondary, city, zone, address, segment),
  product:products(name, price),
  created_by (-> profiles.full_name pour le nom de l'appelant),
  delivery_person:delivery_persons(id, user_id, status -> profiles.full_name)
```

Note : comme il n'y a pas de relation directe delivery_persons -> profiles, les profils des livreurs et appelants seront recuperes dans une seconde requete (pattern existant dans useOrders).

### Requete enrichie pour les clients
```text
clients -> select:
  id, full_name, phone, phone_secondary, city, zone, address,
  segment, notes, total_orders, total_spent
```

### Interaction utilisateur
1. L'utilisateur tape dans la barre de recherche
2. Les resultats apparaissent avec des informations detaillees
3. Un clic ouvre la Dialog de fiche detaillee
4. Le bouton "Voir dans la liste" reste disponible pour naviguer vers la page complete si besoin

