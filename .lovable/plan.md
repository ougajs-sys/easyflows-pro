

# Plan : Corriger l'affichage en 2 temps des landing pages

## Cause racine

- `ProductLanding` est charge via `lazy()` (ligne 46) → chunk JS separe → Suspense affiche le spinner avant le contenu
- Routes `/p/:slug` et `/embed/order` dupliquees dans `AppRouter` ET `AppContent` → conflits de rendu possibles

## Corrections dans `src/App.tsx`

### 1. Import direct (pas de lazy)
```typescript
// Remplacer les lazy imports
import ProductLanding from "./pages/ProductLanding";
import EmbedOrderForm from "./pages/EmbedOrderForm";
```

### 2. Supprimer les routes dupliquees dans AppContent
Retirer les lignes `/p/:slug`, `/embed/order` et `/install` du bloc `<Routes>` dans `AppContent` — elles sont deja gerees par `AppRouter`.

### 3. Supprimer Suspense pour les routes publiques dans AppRouter
Puisque les composants sont importes directement, plus besoin de `Suspense` :
```typescript
if (isPublicRoute) {
  return (
    <RouteErrorBoundary>
      <Routes>
        <Route path="/p/:slug" element={<ProductLanding />} />
        <Route path="/embed/order" element={<EmbedOrderForm />} />
      </Routes>
    </RouteErrorBoundary>
  );
}
```

## Fichier modifie
- `src/App.tsx`

