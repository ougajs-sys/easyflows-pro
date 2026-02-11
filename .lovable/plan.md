

# Correction des Crashs du Service Worker et du Build

## Probleme identifie

L'application crash a l'ouverture des formulaires embarques (et aussi en production) a cause de 2 problemes lies au service worker et aux notifications push :

### Probleme 1 : Le build echoue completement
Le script `prebuild` (`scripts/inject-firebase-config.cjs`) appelle `process.exit(1)` quand les variables Firebase ne sont pas configurees. Comme ces variables ne sont pas encore definies, **tout le build est bloque**.

### Probleme 2 : Le service worker crash au chargement
Dans `vite.config.ts`, le parametre `injectionPoint: undefined` empeche Vite d'injecter la liste des fichiers a mettre en cache (`__WB_MANIFEST`). Quand le service worker appelle `precacheAndRoute(self.__WB_MANIFEST)`, la valeur est `undefined`, ce qui cause l'erreur "e is not iterable". Ce crash du service worker provoque ensuite l'ecran de blocage visible sur la capture d'ecran.

## Solution

### 1. Rendre le script prebuild tolerant (scripts/inject-firebase-config.cjs)

Au lieu de tuer le build, le script affichera un avertissement et continuera si les variables Firebase ne sont pas configurees. Le fichier `firebase-messaging-sw.js` ne sera simplement pas genere.

```text
Avant : process.exit(1) → build echoue
Apres : console.warn(...) → build continue normalement
```

### 2. Corriger la configuration du service worker (vite.config.ts)

Retirer `injectionPoint: undefined` pour permettre a Vite d'injecter correctement le manifeste de precache dans le service worker.

```text
Avant : injectManifest: { injectionPoint: undefined }
Apres : injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png,ico}'] }
```

### 3. Securiser le service worker (src/service-worker.ts)

Ajouter une verification defensive avant d'appeler `precacheAndRoute` pour eviter le crash si le manifeste n'est pas injecte.

```text
Avant : precacheAndRoute(self.__WB_MANIFEST)  // crash si undefined
Apres : verification que __WB_MANIFEST existe et est iterable avant l'appel
```

## Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `scripts/inject-firebase-config.cjs` | Remplacer `process.exit(1)` par un `console.warn` + `return` |
| `vite.config.ts` | Corriger la configuration `injectManifest` |
| `src/service-worker.ts` | Ajouter une garde defensive sur `__WB_MANIFEST` |

## Resultat attendu

- Le build fonctionne meme sans les variables Firebase configurees
- Les formulaires embarques s'ouvrent sans crash
- Les notifications push fonctionneront des que les cles Firebase seront ajoutees
- Aucune regression sur le reste de l'application

