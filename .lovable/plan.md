
# Plan de Correction: Stabilisation de la plateforme et correction des erreurs recurrentes

## Resume des problemes identifies

### Probleme Principal: Erreurs de build TypeScript
Les erreurs de compilation empechent le fonctionnement correct de l'application:

1. **`useCollectedRevenues.tsx`** - Appels RPC manquants dans les types
   - Ligne 147: `get_caller_revenue_summary` n'existe pas dans les types generees
   - Ligne 168: Erreur `.length` sur un type incorrect
   - Ligne 196: `process_revenue_deposit` n'existe pas dans les types generees

Ces fonctions **existent dans la base de donnees** (migration `20260127160000_revenue_tracking_system.sql`) mais les types TypeScript generees ne les incluent pas encore. Le fichier `src/integrations/supabase/types.ts` n'a pas ete regenere.

### Probleme Secondaire: Violation CSP (Content Security Policy)
Console logs montrent:
```
Loading the stylesheet 'fonts.googleapis.com...' violates Content Security Policy directive: "style-src 'self' 'unsafe-inline'"
```
Le `netlify.toml` bloque Google Fonts, causant des problemes de rendu.

### Probleme Tertiaire: Sessions expirees et tokens invalides
```
POST /auth/v1/token?grant_type=refresh_token - Status 400
Response: {"code":"refresh_token_not_found","message":"Invalid Refresh Token: Refresh Token Not Found"}
```
Quand la session expire, l'utilisateur voit des erreurs au lieu d'etre redirige vers la page de connexion.

### Probleme Quaternaire: Gestion des erreurs React
L'ErrorBoundary affiche "Un ecran a rencontre un blocage" au lieu de gerer les erreurs de maniere granulaire. Les erreurs non critiques (comme les dates invalides ou les requetes echouees) declenchent l'ecran d'erreur global.

---

## Plan de correction par ordre de priorite

### Etape 1: Corriger les erreurs de build TypeScript (CRITIQUE)

#### 1.1 Modifier `useCollectedRevenues.tsx`
Remplacer les appels `.rpc()` par des appels HTTP directs ou utiliser des assertions de type pour contourner temporairement le probleme de types:

```typescript
// Avant (cause l'erreur)
const { data, error } = await supabase.rpc('get_caller_revenue_summary', {...})

// Apres (correction avec bypass type)
const { data, error } = await (supabase.rpc as any)('get_caller_revenue_summary', {...})
```

ET corriger la verification `.length`:
```typescript
// Avant (erreur)
if (data && data.length > 0) {

// Apres (correction avec assertion de type)
if (data && Array.isArray(data) && data.length > 0) {
```

### Etape 2: Corriger la politique CSP (IMPORTANT)

#### 2.1 Modifier `netlify.toml`
Ajouter `https://fonts.googleapis.com` et `https://fonts.gstatic.com` dans les directives CSP:

```toml
Content-Security-Policy = "default-src 'self'; 
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://esm.sh https://unpkg.com; 
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
  font-src 'self' data: https://fonts.gstatic.com; 
  img-src 'self' data: https:; 
  connect-src 'self' https://*.supabase.co https://sentry.io https://api.messenger360.com wss://*.supabase.co; 
  frame-ancestors 'self' https://*.wordpress.com https://*.elementor.cloud *;"
```

### Etape 3: Ameliorer la gestion des sessions expirees (IMPORTANT)

#### 3.1 Modifier `useAuth.tsx`
Ajouter une gestion plus robuste des erreurs de refresh token:

```typescript
// Detecter les erreurs de token et rediriger vers la page de connexion
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED' && !session) {
    // Token refresh echoue, nettoyer le storage et rediriger
    localStorage.removeItem('sb-qpxzuglvvfvookzmpgfe-auth-token');
    window.location.href = '/auth';
  }
});
```

### Etape 4: Ameliorer l'ErrorBoundary (RECOMMANDE)

#### 4.1 Modifier `App.tsx`
Ajouter une logique pour ignorer certaines erreurs non critiques et ne pas afficher l'ecran d'erreur pour des problemes mineurs.

### Etape 5: Securiser les formatages de dates (PREVENTIF)

#### 5.1 Creer un utilitaire global `safeFormatDate`
Deplacer la fonction `safeFormatDate` de `OrderDetailPopup.tsx` vers `src/lib/utils.ts` et l'utiliser partout dans l'application (27 fichiers affectes avec 195 instances de `format(new Date(...)`).

---

## Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/hooks/useCollectedRevenues.tsx` | Corriger les appels RPC avec assertions de type + verification Array |
| `netlify.toml` | Ajouter Google Fonts dans la CSP |
| `src/hooks/useAuth.tsx` | Gerer les erreurs de refresh token |
| `src/App.tsx` | Ameliorer l'ErrorBoundary pour ignorer les erreurs non critiques |
| `src/lib/utils.ts` | Ajouter fonction utilitaire `safeFormatDate` |

---

## Details techniques supplementaires

### Pourquoi les types ne sont pas a jour?
Le fichier `src/integrations/supabase/types.ts` est genere automatiquement par Supabase. Les fonctions `get_caller_revenue_summary` et `process_revenue_deposit` ont ete ajoutees dans la migration `20260127160000` mais les types n'ont pas ete regeneres depuis.

**Solution temporaire**: Utiliser des assertions de type `(supabase.rpc as any)` pour contourner le probleme.

**Solution definitive**: Regenerer les types Supabase (fait automatiquement lors du prochain deploiement).

### Impact sur les livreurs
Les demandes d'approvisionnement utilisent `useSupplyRequests.tsx` et `useDeliveryPerson.tsx`. Ces hooks sont fonctionnels, mais si l'application ne charge pas correctement a cause des erreurs de build, les livreurs voient l'ecran d'erreur global.

---

## Ordre d'implementation

1. Corriger `useCollectedRevenues.tsx` (resolution immediate des erreurs de build)
2. Mettre a jour `netlify.toml` (resolution des erreurs CSP)
3. Ameliorer `useAuth.tsx` (gestion des sessions expirees)
4. Ameliorer `App.tsx` (ErrorBoundary plus robuste)
5. Ajouter `safeFormatDate` dans utils.ts (prevention)

Ces corrections devraient eliminer les erreurs recurrentes "Une erreur s'est produite" et stabiliser la plateforme pour tous les utilisateurs (livreurs, appelants, superviseurs).
