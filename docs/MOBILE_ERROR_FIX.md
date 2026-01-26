# Mobile Error Handling Fix - Order Status Update

## Contexte

Ce document décrit les changements apportés pour résoudre le problème d'affichage de l'écran d'erreur global ("Un écran a rencontré un blocage") sur mobile (iOS/Android) lors du changement de statut d'une commande depuis la popup de détail.

## Problème Initial

Sur mobile, lors du changement de statut d'une commande depuis la popup de détail (`OrderDetailPopup.tsx`), l'application affichait l'écran global d'erreur provenant de `NavigationErrorBoundary` dans `App.tsx`. Ce problème ne se produisait pas sur desktop.

### Causes Identifiées

1. **Formatage de dates non sécurisé**: `format(new Date(order.created_at), ...)` peut lever une exception sur Safari iOS avec des dates invalides
2. **Opérations asynchrones non protégées**: Les mises à jour de statut et l'enregistrement de paiements pouvaient générer des erreurs non gérées
3. **Accès non sécurisés aux champs optionnels**: Accès à `order.order_number`, etc. sans vérification
4. **Race condition sur démontage**: `onClose()` après des opérations async pouvait déclencher `setState` sur un composant démonté
5. **Récupération ErrorBoundary insuffisante**: Le bouton "Réessayer" ne réinitialisait que l'état sans effacer le cache des requêtes
6. **Contexte d'erreur insuffisant**: Les logs Bugsnag ne contenaient pas d'informations sur l'ordre, le statut ou l'action

## Modifications Apportées

### 1. OrderDetailPopup.tsx

#### Ajout d'imports pour la gestion sécurisée des dates
```typescript
import { format, isValid, parseISO } from "date-fns";
import bugsnagClient from "@/lib/bugsnag";
```

#### Fonction helper pour formatage de dates sécurisé
```typescript
const safeFormatDate = (dateString: string | null | undefined, formatString: string): string => {
  try {
    if (!dateString) return "Date invalide";
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    if (!isValid(date)) {
      console.warn("Invalid date encountered:", dateString);
      return "Date invalide";
    }
    return format(date, formatString, { locale: fr });
  } catch (error) {
    console.error("Error formatting date:", error, "Input:", dateString);
    return "Date invalide";
  }
};
```

#### Fonction helper pour génération de date ISO sécurisée
```typescript
const safeGetCurrentISODate = (): string => {
  try {
    const now = new Date();
    if (!isValid(now)) throw new Error("Invalid current date");
    return now.toISOString();
  } catch (error) {
    console.error("Error getting current ISO date:", error);
    // Fallback manuel si toISOString() échoue
    const now = new Date();
    return now.getFullYear() + '-' + /* ... */;
  }
};
```

#### Protection contre setState sur composant démonté
```typescript
const isMountedRef = useRef(true);

useEffect(() => {
  isMountedRef.current = true;
  return () => {
    isMountedRef.current = false;
  };
}, []);
```

#### Gestion d'erreurs améliorée dans handleStatusChange
- Vérification de `isMountedRef.current` avant les opérations d'état
- Utilisation de `safeGetCurrentISODate()` pour les dates
- Logging contextuel via Bugsnag avec ordre ID, numéro de commande, statuts
- Try-catch complet autour de toutes les opérations async
- Vérification de montage avant `invalidateQueries`, `toast` et `onClose()`

#### Gestion d'erreurs améliorée dans handleRecordPayment
- Même approche que `handleStatusChange`
- Protection contre les valeurs nulles lors du calcul (`Number(order.amount_paid || 0)`)
- Logging contextuel complet incluant les montants

### 2. App.tsx - NavigationErrorBoundary

#### Amélioration du logging d'erreurs
```typescript
componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  bugsnagClient.notify(error, (event) => {
    event.context = "NavigationErrorBoundary";
    event.addMetadata("errorInfo", {
      componentStack: errorInfo.componentStack,
    });
    event.addMetadata("location", {
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    });
  });
}
```

#### Amélioration de la récupération
```typescript
handleRetry = () => {
  // Effacer le cache React Query pour éviter les données périmées
  if (this.props.queryClient) {
    console.log("Clearing React Query cache before retry...");
    this.props.queryClient.clear();
  }
  
  this.setState({ hasError: false });
  bugsnagClient.leaveBreadcrumb("User initiated error recovery from ErrorBoundary");
};
```

#### Passage du queryClient
```typescript
interface NavigationErrorBoundaryProps {
  children: React.ReactNode;
  resetKey: string;
  queryClient?: typeof queryClient; // Nouveau
}

// Dans RouteErrorBoundary
<NavigationErrorBoundary resetKey={location.key} queryClient={queryClient}>
```

## Comment Tester sur Mobile

### Pré-requis
- Application déployée ou servie en mode dev accessible depuis mobile
- Compte de test avec des commandes existantes

### Scénarios de Test

#### 1. Test du changement de statut normal
1. Ouvrir l'application sur un appareil mobile iOS ou Android
2. Naviguer vers le tableau de bord
3. Cliquer sur une commande pour ouvrir la popup de détail
4. Changer le statut via le dropdown
5. **Résultat attendu**: Le statut est mis à jour, un toast de succès s'affiche, la popup se ferme, pas d'écran d'erreur

#### 2. Test avec connexion réseau instable
1. Activer le mode "Réseau lent" ou désactiver temporairement le WiFi/données
2. Ouvrir une commande
3. Essayer de changer le statut
4. **Résultat attendu**: Toast d'erreur s'affiche avec le message réseau, l'application reste utilisable, pas d'écran d'erreur global

#### 3. Test d'enregistrement de paiement
1. Ouvrir une commande avec montant dû > 0 et statut "pending"
2. Cliquer sur "Enregistrer un dépôt"
3. Entrer un montant
4. Confirmer
5. **Résultat attendu**: Paiement enregistré, statut confirmé, toast de succès, pas d'écran d'erreur

#### 4. Test de la récupération ErrorBoundary
1. Si une erreur se produit et l'écran d'erreur s'affiche
2. Cliquer sur "Réessayer"
3. **Résultat attendu**: Le cache est effacé, l'application se relance proprement, les données sont rechargées

#### 5. Test spécifique Safari iOS
1. Utiliser Safari sur iOS (iPhone/iPad)
2. Effectuer tous les tests ci-dessus
3. **Focus spécifique**: Vérifier que le formatage de dates ne cause pas d'erreurs

### Reproduction du Bug Original (avant fix)

Pour vérifier que le bug est bien corrigé, voici comment le reproduire sur la version précédente:

1. Checkout du commit avant ce fix
2. Ouvrir sur Safari iOS
3. Ouvrir une commande avec une date invalide ou malformée dans `created_at`
4. Observer l'écran d'erreur "Un écran a rencontré un blocage"

**Note**: Avec les corrections, ce scénario ne devrait plus déclencher l'écran d'erreur.

## Logging et Monitoring

### Informations Loggées

Les erreurs sont maintenant loguées avec le contexte suivant dans Bugsnag:

#### Pour les erreurs de mise à jour de statut
- **Context**: "OrderDetailPopup.handleStatusChange"
- **Métadonnées ordre**: ID, numéro de commande, statut actuel, statut cible
- **Métadonnées erreur**: message, code, details, hint

#### Pour les erreurs de paiement
- **Context**: "OrderDetailPopup.handleRecordPayment"
- **Métadonnées ordre**: ID, numéro de commande, statut actuel, statut cible
- **Métadonnées paiement**: montant, nouveau montant payé
- **Métadonnées erreur**: message, code, details, hint

#### Pour les erreurs ErrorBoundary
- **Context**: "NavigationErrorBoundary", "window.error", ou "unhandledrejection"
- **Métadonnées location**: pathname, search, hash
- **Métadonnées supplémentaires**: componentStack (pour React errors), event details (pour window errors)

### Breadcrumbs Ajoutés
- "update_order_status" avec ID commande et statuts
- "record_payment" avec ID commande et montant
- "User initiated error recovery from ErrorBoundary"

## Tests de Non-Régression

Pour s'assurer que les changements n'ont pas cassé de fonctionnalités existantes:

1. ✅ Build TypeScript réussit sans erreurs
2. ✅ Popup de détail s'affiche correctement
3. ✅ Changement de statut fonctionne sur desktop
4. ✅ Enregistrement de paiement fonctionne sur desktop
5. ✅ Formatage de dates affiche correctement les dates valides
6. ✅ Navigation entre les pages fonctionne
7. ✅ ErrorBoundary attrape toujours les erreurs

## Compatibilité

- ✅ Chrome Desktop/Mobile
- ✅ Firefox Desktop/Mobile
- ✅ Safari Desktop (macOS)
- ✅ Safari Mobile (iOS) - Fix spécifique pour dates
- ✅ Edge Desktop/Mobile
- ✅ Chrome Android

## Notes Importantes

- **Pas de données sensibles** dans les logs (pas de numéros de téléphone, emails, adresses complètes)
- **Fallbacks gracieux** pour toutes les opérations critiques
- **Vérification de montage** pour éviter les setState sur composants démontés
- **Cache clearing** lors de la récupération pour éviter les boucles d'erreurs
- **Validation de dates** avant formatage pour compatibilité Safari iOS

## Autres Zones à Surveiller

La codebase contient **39 autres instances** de `format(new Date(...))` qui pourraient potentiellement causer des problèmes similaires sur Safari iOS. Ces instances n'ont pas été modifiées dans ce fix car:
1. Elles ne sont pas directement liées à l'erreur mobile rapportée
2. Elles peuvent ne pas avoir les mêmes problèmes (par exemple, si les dates viennent de sources fiables)
3. Le changement doit rester minimal et ciblé

**Recommandation**: Si d'autres erreurs mobiles similaires sont détectées, envisager de:
- Créer une fonction utilitaire globale `safeFormatDate()` dans `src/lib/utils.ts`
- Remplacer progressivement les instances à risque
- Ajouter un linter rule pour détecter les appels non sécurisés

## Prochaines Étapes Suggérées

1. Monitorer les logs Bugsnag pour identifier d'autres patterns d'erreurs mobiles
2. Envisager d'ajouter des tests E2E spécifiques pour mobile
3. Si d'autres erreurs de dates surviennent, créer une fonction globale `safeFormatDate()`
4. Considérer l'ajout d'un retry automatique avec exponential backoff pour les erreurs réseau
5. Envisager un audit complet des 39 autres instances de formatage de dates

## Liens Utiles

- [Documentation date-fns](https://date-fns.org/)
- [React Query Error Handling](https://tanstack.com/query/latest/docs/react/guides/query-invalidation)
- [Supabase Error Handling](https://supabase.com/docs/reference/javascript/error-handling)
