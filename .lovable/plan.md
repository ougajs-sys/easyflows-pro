

# Page "Landing Pages" — Editeur style Lovable (config + preview)

## Concept

Creer une page dediee `/landing-pages` avec un editeur pleine page inspire de Lovable : panneau de configuration a gauche, apercu en temps reel a droite. Accessible directement depuis la sidebar.

## Architecture de l'editeur

```text
┌─────────────────────────────────────────────────────────┐
│  ← Retour aux landing pages    [Copier le lien] [Sauv] │
├────────────────────────┬────────────────────────────────┤
│  CONFIGURATION         │  APERCU EN DIRECT              │
│                        │                                │
│  Produit: [Select ▼]   │  [📱 Mobile] [🖥 Desktop]      │
│  Prix: auto            │                                │
│  Slug: [auto-genere]   │  ┌────────────────────────┐   │
│                        │  │                        │   │
│  Titre: [...]          │  │  Rendu HTML / Template  │   │
│  Description: [...]    │  │                        │   │
│  Image URL: [...]      │  │  ─────────────────────  │   │
│  Couleur: [picker]     │  │  Formulaire commande   │   │
│  Pixel ID: [...]       │  │                        │   │
│                        │  └────────────────────────┘   │
│  ── Code HTML ──       │                                │
│  [textarea grand]      │                                │
│  mono, colore          │                                │
│                        │                                │
└────────────────────────┴────────────────────────────────┘
```

L'apercu se met a jour en temps reel a chaque modification de champ. Toggle mobile/desktop change la largeur de l'iframe d'apercu.

## Fichiers a creer / modifier

### 1. `src/pages/LandingPages.tsx` — Page principale

- **Vue liste** : cards des landing pages existantes (produits avec slug), bouton "Creer une landing page"
- **Vue editeur** : panneau split gauche/droite avec `ResizablePanelGroup`
- Charge les produits depuis `useProducts`, filtre ceux avec slug pour la liste

### 2. `src/components/landing/LandingPageEditor.tsx` — Editeur split

- Panneau gauche : formulaire (select produit, slug, headline, description, image, HTML, couleur, pixel ID)
- Panneau droit : iframe ou div avec rendu en temps reel du HTML + formulaire commande
- Toggle mobile (375px) / desktop (100%) pour l'apercu
- Bouton "Copier le lien" toujours visible dans la barre superieure
- Bouton "Sauvegarder" qui appelle `updateProduct` du hook existant

### 3. `src/components/landing/LandingPageCard.tsx` — Card pour la liste

- Miniature visuelle, nom produit, URL, badge actif/inactif
- Actions : editer, copier le lien, supprimer la landing

### 4. `src/components/layout/Sidebar.tsx` — Nouvel item

- Label : "Landing Pages", icone `Globe`, path `/landing-pages`
- Roles : `["superviseur", "administrateur"]`
- Position : apres "Formulaires Embed" (id 12)

### 5. `src/App.tsx` — Route

- `/landing-pages` → `LandingPages` (protegee superviseur + administrateur)

## Details techniques

- L'apercu utilise `dangerouslySetInnerHTML` dans un conteneur avec styles scopes (meme rendu que `ProductLanding.tsx`)
- Si pas de HTML custom, l'apercu montre le template par defaut (hero + prix)
- Le select produit lie automatiquement le prix et le stock
- Le slug est auto-genere depuis le nom du produit selectionne
- Les composants `ResizablePanel` existants sont reutilises pour le split

