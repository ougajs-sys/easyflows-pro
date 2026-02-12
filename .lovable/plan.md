

## Rendre les notes de livraison toujours visibles sur la fiche livreur

### Probleme
Les **notes de livraison** (`delivery_notes`) -- remplies par l'appelant ou le superviseur lors du traitement de la commande -- sont cachees dans la section depliable. Le livreur doit cliquer pour les voir, ce qui ralentit son travail et l'oblige parfois a appeler pour obtenir les informations.

### Ce qui change
- Le **nom du client** passe en `text-base font-semibold` pour etre plus visible
- Les **notes de livraison** sont sorties de la section depliable et affichees **toujours visibles**, juste apres l'adresse, dans un encadre ambre avec une icone
- La section depliable conserve uniquement les details financiers

### Fichier modifie

**`src/components/delivery/DeliveryOrderCard.tsx`**

1. Ligne 160 : agrandir le nom du client (`text-base font-semibold` au lieu de `font-medium`)
2. Ajouter un bloc visible apres l'adresse (ligne ~190) pour afficher `delivery_notes` dans un encadre `bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800` avec icone `MessageSquare`
3. Retirer `delivery_notes` de la section depliable (lignes 211-215)
4. Importer `MessageSquare` depuis lucide-react

### Resultat visuel

```text
+--------------------------------------------------+
| CMD-000203  [Confirmee]                      [v]  |
| 10 fevr., 06:52                                   |
|                                                   |
| JEAN DUPONT                                       |  <-- Plus gros, en gras
| Tel: 0747695677 / 0700000000                      |
| Adr: Tanda gare TSR  [Zone Nord]                  |
|                                                   |
| [!] Livrer avant 14h, sonner 2 fois, apt 3B      |  <-- Toujours visible, fond ambre
|                                                   |
| [CREME APDMP x2]                     19 800 F     |
|                                     Reste: 19 800 |
|                                                   |
| [  Demarrer la livraison  ]              [X]      |
+--------------------------------------------------+
```

Aucun changement de donnees ni de requete Supabase -- le champ `delivery_notes` est deja charge. Seul l'affichage est reorganise.

