

# Etat des Lieux - Systeme de Notifications Push

## Ce qui est en place

| Composant | Statut | Details |
|-----------|--------|---------|
| Tables DB (`user_push_tokens`, `push_log`) | OK | Creees avec RLS |
| Edge Function `send-push-notification` | OK | Code complet avec FCM HTTP v1 |
| Hook frontend `usePushNotifications` | OK | Gestion token + permissions |
| Hook `useInitializePushNotifications` | OK | Auto-init au login |
| UI Parametres (`PushNotificationSettings`) | OK | Toggle dans le profil |
| Service Worker (push handler) | OK | Gere les events push + click |
| Trigger messages (chat) | OK | `messages_push_notify` appelle une edge function |
| Secret `FIREBASE_SERVICE_ACCOUNT_JSON` | OK | Configure dans Supabase |

## Ce qui manque (3 elements bloquants)

### 1. Cles Firebase publiques non configurees

Le fichier `src/config/firebase.ts` utilise `import.meta.env.VITE_FIREBASE_*` qui sont **toutes vides**. Le fichier `.env` ne contient que les variables Supabase. Sans ces cles, le frontend ne peut pas initialiser Firebase ni obtenir de token FCM.

**Action** : Hardcoder les cles publiques Firebase directement dans `src/config/firebase.ts` (ce sont des cles publiques, pas de risque de securite). L'utilisateur doit fournir : `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`, et `vapidKey`.

### 2. Secret `FCM_PROJECT_ID` potentiellement manquant

L'edge function `send-push-notification` lit `FCM_PROJECT_ID` en plus de `FCM_SERVICE_ACCOUNT_JSON`. Ce secret n'apparait pas dans la liste des secrets configures. Il est necessaire pour construire l'URL FCM v1.

**Action** : Ajouter le secret `FCM_PROJECT_ID` dans Supabase (ou l'extraire du JSON du service account deja configure).

### 3. Aucun trigger push sur les commandes

Les triggers sur la table `orders` ne contiennent aucun declencheur pour les notifications push. Seul le chat (`messages`) a un trigger push. Les evenements suivants ne generent donc **aucune notification** :
- Nouvelle commande creee
- Commande assignee a un appelant
- Commande assignee a un livreur

**Action** : Creer des triggers SQL sur `orders` pour appeler l'edge function lors de ces evenements.

### 4. Probleme d'URL dans le trigger messages

Le trigger `messages_push_notify` appelle `push-v1` mais l'edge function s'appelle `send-push-notification`. L'URL est incorrecte : elle pointe vers `https://...functions/v1/push-v1` au lieu de `https://...functions/v1/send-push-notification`.

**Action** : Corriger la fonction `messages_push_notify` pour pointer vers la bonne URL.

## Plan d'implementation

### Etape 1 : Collecte des cles Firebase (utilisateur)

L'utilisateur fournit :
- La configuration SDK Firebase (apiKey, authDomain, projectId, etc.)
- La VAPID key
- Confirmation du project ID Firebase (pour le secret `FCM_PROJECT_ID`)

### Etape 2 : Configuration frontend

Modifier `src/config/firebase.ts` pour hardcoder les valeurs publiques au lieu d'utiliser les variables d'environnement VITE (qui ne sont pas supportees dans Lovable).

### Etape 3 : Ajouter le secret FCM_PROJECT_ID

Stocker le project ID Firebase comme secret Supabase pour l'edge function.

### Etape 4 : Corriger le trigger messages

Mettre a jour la fonction `messages_push_notify` pour appeler la bonne edge function (`send-push-notification`) avec le bon format de payload (le format actuel envoie un payload `type`/`message` mais l'edge function attend `user_id`/`tokens`/`title`/`body`).

### Etape 5 : Creer les triggers orders

Creer une fonction SQL + trigger sur `orders` qui :
- Sur INSERT : notifie les admins/superviseurs d'une nouvelle commande
- Sur UPDATE de `delivery_person_id` : notifie le livreur assigne
- Sur UPDATE du caller assigne : notifie l'appelant

Ces triggers devront :
1. Recuperer les tokens FCM des utilisateurs cibles depuis `user_push_tokens`
2. Appeler l'edge function `send-push-notification` via `pg_net` ou `http_post_with_service_role`

### Etape 6 : Adapter l'edge function (si necessaire)

L'edge function actuelle accepte directement des tokens. Les triggers devront soit :
- Envoyer les tokens directement (recuperes en SQL)
- Ou l'edge function devra etre modifiee pour accepter des `user_ids` et recuperer les tokens elle-meme

La seconde option est plus propre et plus sure.

## Resume des fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/config/firebase.ts` | Hardcoder les cles publiques Firebase |
| Secret Supabase `FCM_PROJECT_ID` | Ajouter via l'outil secrets |
| Migration SQL | Corriger `messages_push_notify` + creer triggers `orders` |
| `supabase/functions/send-push-notification/index.ts` | Ajouter support `user_ids` (recupere tokens en interne) |

## Prerequis utilisateur

Avant de commencer l'implementation, l'utilisateur doit fournir :
1. Les 6 cles de configuration Firebase SDK (publiques)
2. La VAPID key
3. Le project ID Firebase (pour le secret)

