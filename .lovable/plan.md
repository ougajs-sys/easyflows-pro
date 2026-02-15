

# Notifications push invisibles et inactives sur mobile -- Solution definitive

## Probleme identifie

Deux problemes distincts empechent les notifications push de fonctionner sur mobile :

### 1. La carte "Notifications Push" est masquee sur mobile
Dans `usePushNotifications.ts` (ligne 22), le check `isSupported` teste :
```text
'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
```
Sur certains navigateurs mobiles ou PWA installees, ces APIs peuvent ne pas etre toutes disponibles au moment du check (chargement asynchrone du service worker, WebView restreint). Quand `isSupported = false`, le composant `PushNotificationSettings` affiche un message "non supporte" sans aucune action possible.

### 2. L'initialisation automatique echoue silencieusement
Dans `useInitializePushNotifications.ts` (ligne 16), si `isSupported` est `false`, le hook retourne immediatement sans rien faire. L'utilisateur n'est jamais enregistre pour les notifications.

De plus, le hook ne se re-execute jamais apres le premier rendu (`hasInitialized.current = true`), meme si les APIs deviennent disponibles apres le chargement du service worker.

## Solution

### Fichier 1 : `src/hooks/usePushNotifications.ts`

**Rendre la detection plus robuste et asynchrone :**
- Remplacer le check synchrone unique par une detection progressive : verifier d'abord `Notification` et `serviceWorker`, puis attendre que le service worker soit `ready` avant de verifier `PushManager`
- Ajouter un etat `isChecking` pour differencier "pas encore verifie" de "pas supporte"
- Re-verifier le support si le premier check echoue (retry apres 3 secondes pour laisser le temps au SW de s'installer)

**Changements concrets :**
- Nouveau state `isChecking` (true par defaut)
- Le `useEffect` fait une detection en 2 etapes : check rapide puis verification via `navigator.serviceWorker.ready`
- Si le premier check echoue, un retry apres 3s est programme
- `isSupported` passe a `true` des que toutes les APIs sont confirmees

### Fichier 2 : `src/hooks/useInitializePushNotifications.ts`

**Rendre l'initialisation reactive et persistante :**
- Supprimer le garde `hasInitialized.current` qui empeche la re-execution
- Utiliser un state `hasRegistered` pour tracker si l'enregistrement a reussi (pas juste tente)
- Re-executer quand `isSupported` passe de `false` a `true` (apres detection asynchrone)
- Ajouter un listener sur `auth.onAuthStateChange` pour re-enregistrer a chaque connexion (pas seulement au premier rendu)
- Si la permission est deja `granted`, toujours rafraichir le token FCM (les tokens expirent)

**Changements concrets :**
- Le `useEffect` reagit a `isSupported` et `isPermissionGranted`
- Ajout d'un listener `onAuthStateChange('SIGNED_IN')` qui declenche l'enregistrement
- Rafraichissement du token a chaque connexion si permission deja accordee
- Plus de `setTimeout` arbitraire de 2 secondes

### Fichier 3 : `src/components/profile/PushNotificationSettings.tsx`

**Toujours afficher la carte avec un etat clair :**
- Quand `isChecking` : afficher un spinner "Verification en cours..."
- Quand `!isSupported` : afficher un message explicatif avec des instructions specifiques selon la plateforme (iOS Safari, Android Chrome, navigateur desktop) au lieu de simplement "non supporte"
- Quand `isSupported` : afficher le toggle (comportement actuel)
- Ajouter un bouton "Reactiver" qui force un nouveau `requestPermission()` pour re-generer le token FCM (utile si le token a expire)

### Fichier 4 : `src/hooks/usePushNotifications.ts` (complement)

**Rafraichissement automatique du token :**
- Ajouter une fonction `refreshToken()` exportee qui re-genere le token FCM et met a jour la base
- Appeler cette fonction a chaque connexion utilisateur (via `useInitializePushNotifications`)
- Cela garantit que meme si le token a change (reinstallation PWA, nettoyage du navigateur), l'utilisateur reste joignable

## Resultat attendu

1. Sur mobile, la carte "Notifications Push" est **toujours visible** avec un etat clair
2. Les notifications sont **automatiquement activees** a chaque connexion
3. Les tokens FCM sont **rafraichis automatiquement** pour eviter les tokens expires
4. Si le support push n'est pas disponible, l'utilisateur voit des **instructions specifiques** a son appareil
5. Un bouton "Reactiver" permet de forcer la re-generation du token en cas de probleme

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/hooks/usePushNotifications.ts` | Detection asynchrone progressive + `refreshToken()` + export `isChecking` |
| `src/hooks/useInitializePushNotifications.ts` | Initialisation reactive + listener auth + rafraichissement token |
| `src/components/profile/PushNotificationSettings.tsx` | UI toujours visible + etat de chargement + instructions mobile + bouton reactiver |

## Aucune migration SQL necessaire

Les tables `user_push_tokens` et `push_log` restent inchangees. Seule la logique client est modifiee.

