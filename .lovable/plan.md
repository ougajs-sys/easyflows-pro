

# Plan : Affichage complet des informations sur les cartes livreur

## Probleme identifie

Les cartes de commande des livreurs (`DeliveryOrderCard`) n'affichent pas :
1. Les **notes client** (`client.notes`) ajoutees par les appelants avec les precisions du client
2. Le nom du client peut apparaitre vide si les donnees ne passent pas correctement dans les types

Le champ `client.notes` existe dans la table `clients` et est recupere par la requete (`clients(*)`) mais n'est **jamais transmis ni affiche** dans la carte livreur car :
- L'interface `Order` dans `DeliveryOrdersList` ne declare pas `notes` dans le type `client`
- Le `DeliveryOrderCard` ne l'affiche pas non plus

## Modifications prevues

### 1. Ajouter `notes` au type client dans DeliveryOrdersList et DeliveryOrderCard

Mettre a jour les interfaces pour inclure `notes: string | null` dans le type `client`.

### 2. Ajouter `notes` au type client dans DeliveryOrders

Meme mise a jour dans le composant parent `DeliveryOrders.tsx`.

### 3. Afficher les notes client sur la carte livreur

Dans `DeliveryOrderCard`, ajouter une section **toujours visible** (comme `delivery_notes`) qui affiche `client.notes` avec un style distinct :
- Icone bloc-notes
- Fond bleu clair pour distinguer des `delivery_notes` (qui sont en jaune/ambre)
- Titre "Notes appelant" pour que le livreur comprenne l'origine

### 4. Ameliorer la visibilite du nom client

S'assurer que le nom du client est bien visible meme si `client` est null : afficher "Client inconnu" comme fallback au lieu de rien.

## Rendu visuel prevu

```text
┌─────────────────────────────────┐
│ #CMD-123         [Confirmee]    │
│ 📅 22 mars, 14:30               │
│                                 │
│ 👤 Amadou Diallo  (gras, grand) │
│ 📞 +225 07 XX XX XX             │
│ 📍 Cocody, Riviera 3  [Zone]    │
│                                 │
│ 📝 Notes appelant:              │  ← NOUVEAU (bleu)
│ "Le client veut etre appele     │
│  avant la livraison"            │
│                                 │
│ 💬 Instructions livraison:      │  ← Existant (ambre)  
│ "Sonner 2 fois au portail"      │
│                                 │
│ 📦 Serum x2          12 000 F   │
│                      Reste: 6000│
│ [Demarrer la livraison]    [X]  │
└─────────────────────────────────┘
```

## Fichiers modifies

- `src/components/delivery/DeliveryOrderCard.tsx` — ajouter affichage `client.notes` + fallback nom
- `src/components/delivery/DeliveryOrdersList.tsx` — ajouter `notes` au type client
- `src/components/delivery/DeliveryOrders.tsx` — ajouter `notes` au type client

Aucune modification base de donnees requise : `clients.notes` existe deja et la requete `clients(*)` le recupere deja.

