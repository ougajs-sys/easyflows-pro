
# Correction : Filtrage de l'Onglet "Paiement en attente"

## Probleme identifie

L'onglet "Paiement en attente" dans l'espace appelant affiche des commandes confirmees qui ne devraient pas y figurer.

### Cause racine

Dans le fichier `src/components/caller/CallerOrders.tsx`, la fonction `filterOrders` (lignes 328-350) utilise une logique incorrecte pour l'onglet "partial" :

```typescript
case "partial":
  // PROBLEME : Filtre par amount_due > 0 au lieu du statut
  return orders.filter((o) => 
    Number(o.amount_due || 0) > 0 && 
    o.status !== "pending" && 
    o.status !== "cancelled" && 
    o.status !== "delivered"
  );
```

Cette logique inclut toutes les commandes avec un solde du (confirmees, en transit, reportees, etc.) au lieu de filtrer uniquement les commandes avec le statut `partial`.

### Donnees en base

| Statut | Commandes sans paiement | Paiement partiel |
|--------|------------------------|------------------|
| pending | 11 | 0 |
| confirmed | 2 | 0 |
| partial | 11 | 2 |
| reported | 12 | 1 |

Les commandes confirmees avec `amount_due > 0` apparaissent dans l'onglet "Paiement en attente" alors qu'elles ne devraient pas.

## Solution

Modifier la logique de filtrage pour utiliser le statut `partial` directement :

```typescript
case "partial":
  // CORRECTION : Filtrer uniquement par statut partial
  return orders.filter((o) => o.status === "partial");
```

## Fichier a modifier

| Fichier | Ligne | Modification |
|---------|-------|--------------|
| `src/components/caller/CallerOrders.tsx` | 335-342 | Simplifier le filtre pour utiliser uniquement `o.status === "partial"` |

## Code avant/apres

### Avant (incorrect)
```typescript
case "partial":
  // Filter by amount_due > 0, excluding pending, cancelled, and delivered orders
  return orders.filter((o) => 
    Number(o.amount_due || 0) > 0 && 
    o.status !== "pending" && 
    o.status !== "cancelled" && 
    o.status !== "delivered"
  );
```

### Apres (correct)
```typescript
case "partial":
  // Afficher uniquement les commandes avec statut "partial" (paiement partiel)
  return orders.filter((o) => o.status === "partial");
```

## Resultat attendu

- L'onglet "Paiement en attente" affichera uniquement les commandes avec le statut `partial`
- Les commandes confirmees resteront dans l'onglet "Confirmee"
- Les statistiques seront correctes
- Reduction de 11+ commandes a environ 14 commandes reellement en paiement partiel
