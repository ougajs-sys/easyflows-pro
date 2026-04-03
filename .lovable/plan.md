

# Plan : Refonte Mobile-First des Landing Pages (Admin + Client)

## Contexte

90% des clients achetent sur mobile en Afrique. Toutes les pages de vente (publique `/p/:slug` et admin `/landing-pages`) doivent etre concues mobile-first avec un rendu parfait sur petit ecran.

---

## 1. Page admin `/landing-pages` — LandingPages.tsx

**Probleme** : padding fixes (p-10, px-8), couleurs hardcodees (#0d1117), pas adapte mobile.

**Corrections** :
- Remplacer `bg-[#14181f]` / `bg-[#0d1117]` par `bg-background` / `bg-card` (design system)
- Padding responsive : `p-4 sm:p-6 lg:p-10`
- Header : `px-4 sm:px-8`
- Bouton "Importer" : texte abrege sur mobile, pleine largeur sur petit ecran
- Grille : `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

## 2. Cards admin — LandingPageCard.tsx

**Probleme** : couleurs hardcodees, boutons petits sur mobile.

**Corrections** :
- Remplacer `bg-[#0d1117]` par `bg-card border-border`
- Textes : `text-foreground` au lieu de `text-white`
- Boutons d'action : taille tactile minimum 44x44px
- Image thumbnail responsive

## 3. Page client `/p/:slug` — ProductLanding.tsx (DefaultLandingHero)

**Probleme** : hero basique, formulaire deconnecte du hero, image trop grande sur mobile.

**Corrections mobile-first** :
- Image produit : `w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64`
- Titre : `text-2xl sm:text-3xl md:text-5xl`
- Description : `text-base sm:text-lg`
- Padding hero : `py-10 px-4 sm:py-16 md:py-24`
- Ajouter un CTA "Commander" qui scrolle vers le formulaire
- Section formulaire : `py-6 sm:py-12 px-4`

## 4. Formulaire de commande — LandingOrderForm.tsx

**Corrections mobile-first** :
- Padding : `p-4 sm:p-6 md:p-8`
- Inputs : `text-base` (16px minimum pour eviter le zoom iOS)
- Bouton submit : hauteur tactile `h-14` sur mobile
- Labels plus grands sur mobile pour lisibilite
- `max-w-lg` conserve, centre sur desktop

## 5. Formulaire injecte (iframe) — buildInjectedFormHtml.ts

**Corrections mobile-first** :
- Padding du container : `padding:1.5rem 1rem` au lieu de `3rem 1rem`
- Inputs : `font-size:16px` (empeche le zoom auto sur iOS)
- Bouton : `padding:1rem`, `font-size:1.1rem`
- `max-width:100%` sur mobile, `max-width:480px` sur desktop via media query
- Ajouter `@media (max-width:640px)` pour ajuster les espacements

## 6. Page de remerciement — LandingThankYou.tsx

**Corrections mobile-first** :
- Padding : `p-4 sm:p-6 md:p-8`
- Texte : `text-xl sm:text-2xl`
- `max-w-md` avec `mx-4` pour marges laterales mobile

## 7. Masquer FloatingChat sur routes publiques — App.tsx

- Condition : ne pas afficher `FloatingChat` quand le `pathname` commence par `/p/` ou `/embed/`

---

## Fichiers modifies

| Fichier | Action |
|---|---|
| `src/pages/LandingPages.tsx` | Design system + responsive mobile-first |
| `src/components/landing/LandingPageCard.tsx` | Design system + cibles tactiles |
| `src/pages/ProductLanding.tsx` | Hero mobile-first + CTA scroll |
| `src/components/landing/LandingOrderForm.tsx` | Inputs 16px + espacement mobile |
| `src/components/landing/buildInjectedFormHtml.ts` | Media queries mobile + font-size 16px |
| `src/components/landing/LandingThankYou.tsx` | Padding et texte responsive |
| `src/App.tsx` | Masquer FloatingChat sur /p/ et /embed/ |

