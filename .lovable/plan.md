

## Correction : Restaurer et securiser la section Notifications Push dans le profil

### Diagnostic

Le code source contient bien le composant `PushNotificationSettings` dans `UserProfile.tsx` (ligne 252). La section est presente dans le code mais n'apparait pas sur le site publie.

Deux causes possibles :
1. Les derniers changements n'ont pas ete **publies** sur le site de production
2. Le composant `PushNotificationSettings` crashe silencieusement a cause d'une erreur (par exemple, une requete a `user_push_tokens` qui echoue), ce qui empeche son rendu sans message d'erreur visible

### Solution

Envelopper le composant `PushNotificationSettings` dans un **error boundary** (via un try-catch dans le rendu) pour qu'il ne puisse jamais faire crasher la page profil, meme en cas d'erreur.

### Modifications

**Fichier : `src/components/profile/UserProfile.tsx`**

Envelopper `<PushNotificationSettings />` dans un bloc de protection pour eviter qu'une erreur dans ce composant ne fasse disparaitre toute la section :

```text
Avant:
  <PushNotificationSettings />

Apres:
  <ErrorBoundary fallback for PushNotificationSettings>
    <PushNotificationSettings />
  </ErrorBoundary>
```

Concretement, creer un petit composant ErrorBoundary (classe React) ou utiliser un wrapper avec un state d'erreur qui affiche un message de repli au lieu de crasher.

**Fichier : `src/components/profile/PushNotificationSettingsWrapper.tsx`** (nouveau)

Un wrapper simple qui capture les erreurs du composant enfant :

```text
- Si le composant fonctionne : affiche normalement les parametres de notifications
- Si le composant crashe : affiche une carte avec un message "Les parametres de notifications ne sont pas disponibles"
```

### Resultat attendu

- La section "Notifications Push" sera **toujours visible** dans le profil, meme en cas d'erreur
- Si tout fonctionne correctement, l'utilisateur verra le switch d'activation et le bouton d'autorisation
- Si une erreur survient, un message de repli s'affichera au lieu de faire disparaitre la section
- Apres publication, les changements seront visibles sur le site de production

### Rappel important

Apres l'application des corrections, vous devrez **publier** le projet pour que les changements apparaissent sur `easyflow-pro.site`.

