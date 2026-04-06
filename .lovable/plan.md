

# Plan : Supprimer le bouton WhatsApp des landing pages

## Contexte

Le bouton WhatsApp flottant sur les pages de vente cree une confusion — la validation des commandes doit se faire uniquement via le formulaire de commande (CTA "Commander").

## Modifications

### 1. `src/components/landing/PremiumHealthLanding.tsx`
Supprimer le bloc WhatsApp Button (lignes 219-228) — le lien `<a href="wa.me/...">` avec l'icone `MessageCircle`.

### 2. `src/components/landing/buildInjectedFormHtml.ts`
- Supprimer le CSS de `#__wa_float` (lignes 152-168)
- Supprimer le HTML du bouton WhatsApp (lignes 171-174)

### Fichiers modifies

| Fichier | Action |
|---|---|
| `src/components/landing/PremiumHealthLanding.tsx` | Supprimer le bouton WhatsApp flottant |
| `src/components/landing/buildInjectedFormHtml.ts` | Supprimer le CSS et HTML du bouton WhatsApp |

