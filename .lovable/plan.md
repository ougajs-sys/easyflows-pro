

# Fix : Page "Formulaires Embarquables" bloquee

## Cause racine

Le `NavigationErrorBoundary` dans `App.tsx` ecoute les `unhandledrejection` globaux (ligne 159). L'inscription du ServiceWorker echoue avec une `SecurityError` (redirection de `dev-sw.js` en preview Lovable). Cette erreur :

1. Passe le filtre `event.reason instanceof Error` (car `DOMException` herite de `Error`)
2. N'est **pas reconnue** par `isNonCriticalError` (aucun pattern ne matche "SecurityError" ou "ServiceWorker")
3. Declenche `setState({ hasError: true })` → affiche l'ecran "Un ecran a rencontre un blocage"

Ce bug affecte **toutes les pages**, pas seulement les formulaires embed — la page embed est simplement celle ou l'utilisateur se trouve quand le ServiceWorker tente de s'enregistrer.

## Correction

**Fichier** : `src/App.tsx`, lignes 50-65 (tableau `nonCriticalPatterns`)

Ajouter deux patterns pour ignorer les erreurs ServiceWorker et SecurityError :

```
/ServiceWorker/i,
/SecurityError/i,
```

C'est un fix minimal et cible. Ces erreurs sont legitimement non-critiques — un echec d'inscription ServiceWorker ne doit jamais crasher l'application.

