

# Plan : Corriger l'affichage des Landing Pages (Mobile + Desktop)

## Problemes identifies

### 1. Mobile : page bloquee sur le spinner de chargement
La route `/p/:slug` est a l'interieur de `AppContent` qui est enveloppe par `AuthProvider` > `NotificationsProvider` > `Suspense`. Sur mobile 4G en Afrique :
- `AuthProvider` fait des appels Supabase (auth, profiles, user_roles) avant que quoi que ce soit s'affiche
- `NotificationsProvider` initialise des subscriptions Realtime
- `useInitializePushNotifications()` essaie de s'enregistrer
- Le `Suspense` fallback reste affiche tant que le chunk JS n'est pas telecharge

**Resultat** : le client voit un spinner pendant 10-30 secondes (ou indefiniment sur connexion instable).

### 2. Desktop : contenu qui deborde / layout casse
L'iframe du HTML custom est enveloppee dans un `<div className="min-h-screen bg-gray-50">` qui applique les styles de l'app (fond gris, padding potentiel). Le contenu HTML custom peut deborder hors de l'iframe ou etre mal positionne a cause du conteneur parent.

## Solution

### Fichier 1 : `src/App.tsx` — Isoler les routes publiques

Restructurer l'App pour que les routes publiques (`/p/:slug`, `/embed/order`) soient rendues **en dehors** de la chaine lourde `AuthProvider > NotificationsProvider > AppContent` :

```
BrowserRouter
├── Routes
│   ├── /p/:slug → ProductLanding (leger, pas de providers lourds)
│   ├── /embed/order → EmbedOrderForm (leger)
│   └── /* → AppContent (avec AuthProvider, Notifications, etc.)
```

Concretement :
- Creer un composant `AppRouter` dans le `BrowserRouter`
- Les routes `/p/` et `/embed/` rendent directement leurs composants avec juste `QueryClientProvider` et `ThemeProvider` (pas d'auth, pas de notifications)
- Les autres routes continuent via `AppContent` avec tous les providers

### Fichier 2 : `src/pages/ProductLanding.tsx` — Layout plein ecran

- Supprimer le wrapper `<div className="min-h-screen bg-gray-50">` autour de l'iframe custom (l'iframe prend 100% de la viewport)
- Pour l'iframe custom : `width:100%; min-height:100vh; border:none; display:block;` sans conteneur parasite
- Garder le wrapper bg-gray-50 uniquement pour le hero par defaut (sans HTML custom)
- Ajouter `margin:0; padding:0; overflow:hidden` au body via style inline sur le conteneur pour eviter tout espace blanc

### Resume des fichiers modifies

| Fichier | Modification |
|---|---|
| `src/App.tsx` | Isoler routes publiques hors des providers lourds (AuthProvider, NotificationsProvider, push notifications) |
| `src/pages/ProductLanding.tsx` | Iframe plein ecran sans wrapper parasite, layout corrige |

