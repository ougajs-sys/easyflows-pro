

# Landing Pages Produit avec Import HTML

## Approche

Ajouter un champ `landing_html` a la table `products` pour permettre de coller du HTML personnalise qui sera rendu dans un cadre securise sur la landing page, tout en gardant le formulaire de commande et le tracking Facebook integres automatiquement.

## Architecture

```text
Admin colle son HTML dans le formulaire produit
  → Sauvegarde dans products.landing_html
    → /p/:slug charge le produit
      → Affiche le HTML custom (hero, images, textes)
      → Ajoute automatiquement : formulaire commande + Pixel Facebook
        → Client commande → webhook-orders → WhatsApp notification
```

## Migration SQL

Ajouter a la table `products` :
- `slug` (text, unique) — URL publique
- `image_url` (text, nullable) — image principale
- `landing_headline` (text, nullable) — titre accrocheur
- `landing_description` (text, nullable) — description marketing
- `landing_html` (text, nullable) — HTML personnalise colle par l'admin
- `facebook_pixel_id` (text, nullable) — Pixel ID par produit
- `brand_color` (text, nullable, default `#2563eb`) — couleur CTA

RLS : ajouter une policy SELECT publique (anon) sur products filtree par `is_active = true AND slug IS NOT NULL` pour les landing pages.

## Page publique `/p/:slug` — `ProductLanding.tsx`

Logique de rendu :
1. Si `landing_html` existe → rendu du HTML custom via `dangerouslySetInnerHTML` dans un conteneur sandboxe (styles scoped)
2. Sinon → template par defaut avec `landing_headline`, `landing_description`, `image_url`, prix
3. Dans tous les cas → formulaire de commande integre en dessous (nom, tel, quantite, adresse)
4. Apres commande → page de remerciement + evenement Purchase (Pixel)

## Formulaire admin — `ProductForm.tsx`

Ajouter une section depliable "Page de destination" avec :
- Slug (auto-genere depuis le nom, modifiable)
- Titre accrocheur (landing_headline)
- Description marketing (landing_description)
- Image URL
- **Zone de texte HTML** — l'admin colle son code HTML existant
- Facebook Pixel ID
- Couleur de marque
- Apercu du lien genere

## Facebook Pixel — `FacebookPixel.tsx`

- Injecte `fbevents.js` si `facebook_pixel_id` est configure
- Evenements : `PageView`, `ViewContent` (auto), `Purchase` (apres commande)
- `event_id` = order ID pour deduplication avec la Conversions API

## Edge Function `facebook-conversions`

- Recoit pixel_id, event_name, value, currency, event_id, client_ip, user_agent
- POST vers `https://graph.facebook.com/v18.0/{pixel_id}/events`
- Token : secret Supabase `FACEBOOK_ACCESS_TOKEN`
- Appelee apres creation de commande si pixel_id configure

## Table des produits — `ProductsTable.tsx`

- Nouvelle action "Copier le lien" pour les produits avec slug
- Badge "Landing" si la page est configuree

## Route — `App.tsx`

- `/p/:slug` → `ProductLanding` (route publique, pas d'auth)

## Fichiers

| Fichier | Action |
|---------|--------|
| Migration SQL | Colonnes slug, landing_html, pixel, etc. |
| `src/pages/ProductLanding.tsx` | Creer — page publique |
| `src/components/landing/FacebookPixel.tsx` | Creer — tracking |
| `src/components/landing/LandingOrderForm.tsx` | Creer — formulaire commande |
| `src/components/landing/LandingThankYou.tsx` | Creer — page remerciement + Purchase |
| `supabase/functions/facebook-conversions/index.ts` | Creer — CAPI serveur |
| `src/App.tsx` | Ajouter route `/p/:slug` |
| `src/components/products/ProductForm.tsx` | Ajouter section landing |
| `src/components/products/ProductsTable.tsx` | Action copier lien |
| `src/hooks/useProducts.tsx` | Mettre a jour types |

