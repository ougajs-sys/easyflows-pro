

# Correction du systeme de campagnes WhatsApp

## Problemes identifies

### 1. Groupes de contacts invisibles dans le selecteur de segments
- Le state `expandedCategories` n'inclut pas `'group'` par defaut - les groupes sont caches au chargement
- Le type TypeScript de `segment` dans `Campaign` est trop restrictif (`'all' | 'new' | 'regular' | 'vip' | 'inactive'`) et ne peut pas stocker `campaign_group:Group-C-1`

### 2. Echecs massifs des campagnes (throttling API)
- Les logs montrent que **701 sur 1000 messages** echouent avec `ThrottlerException: Too Many Requests`
- La fonction `send-sms` envoie les messages en boucle sans aucun delai entre chaque appel API 360messenger
- L'API impose un rate limit que le systeme ne respecte pas

### 3. Double mise a jour du statut
- `send-sms` met a jour le statut de la campagne apres chaque batch
- `useCampaigns.sendCampaign` fait aussi une mise a jour finale
- Cela cause des compteurs incoherents (ex: 123/2833 envoyes au lieu du total reel)

## Plan de correction

### Etape 1 : Corriger la visibilite des groupes
**Fichier** : `src/components/campaigns/CampaignSegmentSelector.tsx`
- Ajouter `'group'` dans le state initial de `expandedCategories`

### Etape 2 : Corriger le type TypeScript du segment
**Fichier** : `src/hooks/useCampaigns.tsx`
- Changer le type de `segment` dans l'interface `Campaign` en `string | null` pour accepter les segments de type `campaign_group:Group-C-X`

**Fichier** : `src/pages/Campaigns.tsx`
- Adapter le type de `newCampaign.segment` pour accepter les valeurs de type groupe

### Etape 3 : Ajouter un delai anti-throttling dans send-sms
**Fichier** : `supabase/functions/send-sms/index.ts`
- Ajouter un delai de 200ms entre chaque envoi de message pour respecter le rate limit de l'API 360messenger
- Supprimer la mise a jour du statut de campagne dans `send-sms` (car c'est deja fait dans `useCampaigns`)

### Etape 4 : Ajouter la segmentation par produit
**Fichier** : `src/hooks/useClientSegments.tsx`
- Ajouter une nouvelle categorie `product` qui regroupe les clients par produit commande
- Inclure specialement les clients ayant annule des commandes pour un produit donne (pour les relances ciblees)

**Fichier** : `src/components/campaigns/CampaignSegmentSelector.tsx`
- Ajouter les icones et labels pour la categorie `product`

**Fichier** : `src/hooks/useCampaigns.tsx`
- Gerer le filtre `product:` dans `sendCampaign` pour recuperer les bons clients

### Etape 5 : Corriger le filtrage dans la fonction Edge
**Fichier** : `supabase/functions/process-scheduled-campaigns/index.ts`
- Ajouter le support des segments `product:` pour les campagnes planifiees

## Resume des fichiers modifies
1. `src/components/campaigns/CampaignSegmentSelector.tsx` - Groupes visibles + categorie produit
2. `src/hooks/useCampaigns.tsx` - Type segment flexible + filtre produit
3. `src/hooks/useClientSegments.tsx` - Segments par produit
4. `src/pages/Campaigns.tsx` - Type segment adapte
5. `supabase/functions/send-sms/index.ts` - Delai anti-throttling + suppression double update
6. `supabase/functions/process-scheduled-campaigns/index.ts` - Support segment produit

