
# Enrichir la fiche client dans la recherche globale

## Problemes identifies (voir screenshot)

1. **Produit manquant** : La requete des commandes du client ne recupere pas le produit (`product:products(name)`)
2. **Appelant manquant** : Le nom de l'appelant est bien recupere dans le code mais ne s'affiche pas toujours (probleme de donnees ou d'affichage)
3. **Montant lie au produit** : Afficher le prix unitaire et le produit pour chaque commande dans l'historique

## Modifications prevues

### Fichier : `src/components/layout/SearchResultDetail.tsx`

#### 1. Enrichir la requete des commandes du client (loadClient)

Ajouter `product:products(name, price)` dans le SELECT des commandes :

```text
Avant:  id, order_number, status, total_amount, created_at, created_by, delivery_person:delivery_persons(user_id)
Apres:  id, order_number, status, total_amount, created_at, created_by, quantity, unit_price, product:products(name, price), delivery_person:delivery_persons(user_id)
```

#### 2. Mettre a jour le type ClientDetail.recent_orders

Ajouter les champs manquants dans l'interface :
- `product_name: string | null` -- nom du produit
- `quantity: number` -- quantite commandee
- `unit_price: number` -- prix unitaire

#### 3. Enrichir l'affichage de chaque commande dans la liste

Chaque carte de commande affichera :
- Numero de commande + badge statut (deja present)
- **Produit** : nom du produit commande (nouveau)
- **Quantite x Prix** : ex. "2 x 4 950" (nouveau)
- Montant total + date (deja present)
- **Appelant** : nom de l'appelant (deja code mais rendu plus visible)
- **Livreur** : nom du livreur (deja present)

### Resultat attendu

La fiche client dans la recherche affichera pour chaque commande :
```
CMD-000053                    Livree
Produit: Nom du produit
2 x 4 950 = 9 900           26/01/2026
Appelant: Jean Dupont . Livreur: GS GROUP
```

### Aucune migration SQL necessaire

Les champs `quantity`, `unit_price` et la relation `products` existent deja dans la table `orders`.
