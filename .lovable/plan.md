

# Plan : Corriger l'affichage tronque des landing pages custom

## Diagnostic

Le probleme ne vient pas du `/p/` dans l'editeur (c'est juste un label visuel). Le vrai probleme est dans `LandingWithCustomHtml` dans `ProductLanding.tsx` :

La fonction `adjustHeight` tente de redimensionner l'iframe a la taille exacte de son contenu via `scrollHeight`. Cela echoue car :
1. Le contenu HTML custom charge Tailwind CDN, des images, des animations CSS de facon asynchrone — le `scrollHeight` est mesure avant que tout soit rendu
2. Le `ResizeObserver` cree une boucle de retour (le redimensionnement de l'iframe change le viewport interne, ce qui change le scrollHeight, etc.)
3. Sur mobile, les elements avec des unites viewport (`vh`, `vw`) se recalculent a chaque changement de hauteur de l'iframe

**Resultat** : le contenu est tronque apres une certaine section, ou l'inverse — espace blanc enorme.

## Solution

Supprimer toute la logique de redimensionnement dynamique de l'iframe. A la place, laisser l'iframe occuper 100% du viewport avec son propre scroll interne. C'est plus fiable et c'est le pattern standard pour afficher du HTML custom.

### Fichier : `src/pages/ProductLanding.tsx`

**Modifier `LandingWithCustomHtml`** :

1. Supprimer le `useCallback` `iframeRef` avec `adjustHeight`, `ResizeObserver`, et les `setTimeout`
2. Remplacer par un iframe simple avec `style="width:100%; height:100vh; border:none; display:block;"` — l'iframe gere son propre defilement interne
3. Ajouter `overflow:hidden` sur le body du document parent pour eviter le double scrollbar (via un `useEffect` qui set `document.body.style.overflow = 'hidden'` et le restaure au cleanup)
4. Injecter dans le `srcDoc` un style `html,body { overflow-y: auto; -webkit-overflow-scrolling: touch; }` pour garantir le scroll fluide dans l'iframe sur iOS

### Detail technique

```
Avant:
  Parent scroll + iframe auto-height → scrollHeight instable → contenu tronque

Apres:
  Parent bloque (overflow:hidden) + iframe 100vh avec scroll interne → tout le contenu visible
```

### Fichier modifie

| Fichier | Modification |
|---|---|
| `src/pages/ProductLanding.tsx` | Supprimer adjustHeight/ResizeObserver, iframe 100vh avec scroll interne, masquer scroll parent |

