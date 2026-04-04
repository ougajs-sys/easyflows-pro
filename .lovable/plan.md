

# Plan : Systeme Premium Health + Coexistence HTML

## Architecture

```text
/p/:slug → ProductLanding.tsx
  ├── product.landing_html present → LandingWithCustomHtml (iframe, inchange)
  │     + injection WhatsApp flottant dans srcDoc
  │
  └── product.landing_html VIDE → PremiumHealthLanding (NOUVEAU)
        ├── UrgencyBar (fixe, rouge, stock dynamique)
        ├── HeroSection (image, headline, prix barre, CTA)
        ├── BenefitsSection (grille icones)
        ├── TestimonialsSection (3 cartes)
        ├── GuaranteeSection (livraison, paiement, naturel)
        ├── StickyBottomBar (apparait apres 500px scroll)
        ├── WhatsAppButton (flottant anime)
        └── OrderModal (popup avec dropdown villes CI)
```

## Fichiers a creer

### 1. `src/data/healthProducts.ts`
Donnees enrichies par defaut pour les produits sante :
- Map `slug → { benefits[], testimonials[], whatsappNumber }`
- Donnees LB10+ pre-remplies (benefices prostate, temoignages)
- 2 emplacements vides pour futurs produits
- Fallback generique si le slug n'est pas dans la map

### 2. `src/components/landing/PremiumHealthLanding.tsx`
Composant React natif complet (pas d'iframe). Accepte `product` + `onOrderSuccess`.

**Sections :**

- **UrgencyBar** : `fixed top-0 z-50`, fond rouge, texte "Plus que {stock} unites disponibles !", animation pulse
- **HeroSection** : gradient `brand_color` → ardoise, image avec `shadow-2xl rounded-[2rem]`, titre `text-3xl md:text-5xl font-black`, prix barre (x1.5) + prix reel, badge "Promo", CTA principal
- **BenefitsSection** : grille 2 colonnes mobile / 3 desktop, icones vertes, coins arrondis `rounded-[1.5rem]`, ombres `shadow-xl`, fond blanc
- **TestimonialsSection** : 3 cartes avec avatar initiales, etoiles, texte, fond gradient subtil
- **GuaranteeSection** : 3 badges (Livraison Gratuite, Paiement a la Livraison, 100% Naturel) avec icones et `shadow-lg`
- **StickyBottomBar** : `fixed bottom-0`, invisible par defaut, apparait via `useEffect` scroll > 500px, affiche prix + bouton "Commander", transition `translate-y`
- **WhatsAppButton** : `fixed bottom-20 right-4`, vert `#25D366`, animation `pulse`, lien `wa.me/225XXXXXXXXXX`
- **OrderModal** : s'ouvre au clic CTA, bottom-sheet mobile / centre desktop

Design tokens : vert emeraude `#059669`, ardoise `#0f172a`, blanc, rouge urgence `#ef4444`, or `#f59e0b`. Adapte par `brand_color` du produit.

Toutes les sections utilisent `IntersectionObserver` pour animation fade-in au scroll.

### 3. `src/components/landing/OrderModal.tsx`
Formulaire de commande en popup, extrait de `LandingOrderForm` :
- Champs : Nom, Telephone, Quantite
- **Champ Ville** : `<select>` avec les communes/villes de CI :
  - Abidjan — Cocody, Yopougon, Marcory, Plateau, Riviera, Treichville, Abobo, Adjame, Koumassi, Port-Bouet
  - Bouake, Yamoussoukro, San-Pedro, Korhogo, Daloa, Man, Gagnoa, Divo, Abengourou, Autre
- Champ Adresse (complement)
- Notes (optionnel)
- Total dynamique
- Submit vers webhook-orders existant
- Transition vers page remerciement via `onOrderSuccess`

## Fichiers a modifier

### 4. `src/pages/ProductLanding.tsx`
- Importer `PremiumHealthLanding`
- Remplacer le bloc `DefaultLandingHero + LandingOrderForm` par `<PremiumHealthLanding product={product} onOrderSuccess={handleOrderSuccess} />`
- Supprimer `DefaultLandingHero` (plus utilisee)
- Dans `LandingWithCustomHtml` : injecter un bouton WhatsApp flottant dans le `srcDoc` (HTML/CSS inline, meme style que le composant React)

### 5. `src/components/landing/LandingOrderForm.tsx`
- Ajouter le champ `city` avec le dropdown villes CI (meme liste que OrderModal)
- Le schema Zod ajoute `city: z.string().min(1)`
- Concatener `city + delivery_address` dans le payload webhook

### 6. `src/components/landing/buildInjectedFormHtml.ts`
- Ajouter un `<select name="city">` avec les villes CI dans le formulaire injecte
- Ajouter le bouton WhatsApp flottant en HTML/CSS inline
- Concatener ville + adresse dans le payload du fetch

## Resume

| Fichier | Action |
|---|---|
| `src/data/healthProducts.ts` | Creer — donnees benefices/temoignages |
| `src/components/landing/PremiumHealthLanding.tsx` | Creer — composant principal premium |
| `src/components/landing/OrderModal.tsx` | Creer — formulaire popup avec villes CI |
| `src/pages/ProductLanding.tsx` | Modifier — brancher PremiumHealthLanding, injecter WhatsApp dans iframe |
| `src/components/landing/LandingOrderForm.tsx` | Modifier — ajouter dropdown villes CI |
| `src/components/landing/buildInjectedFormHtml.ts` | Modifier — ajouter select villes CI + WhatsApp |

