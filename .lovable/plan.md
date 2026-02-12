

# Correction de l'activation des notifications push

## Probleme

Dans `PushNotificationSettings.tsx`, la requete Supabase utilise `.single()` pour charger le statut des notifications. Quand l'utilisateur n'a pas encore de token (avant la premiere activation), cela provoque une erreur 406 qui bloque tout le composant.

## Solution

Remplacer `.single()` par `.maybeSingle()` sur la ligne 27 de `src/components/profile/PushNotificationSettings.tsx`. Cette methode retourne `null` sans erreur quand aucune ligne n'existe, ce qui est exactement le cas avant la premiere activation.

## Impact

- Corrige l'activation des notifications sur web et mobile (PWA / APK)
- Le reste du code gere deja le cas `data === null`, donc aucun autre changement necessaire
- Une fois active, le token FCM est enregistre et les notifications push fonctionnent normalement sur Android et iOS 16.4+

## Detail technique

**Fichier** : `src/components/profile/PushNotificationSettings.tsx`

**Changement** (ligne 27) :
```text
Avant : .eq('user_id', session.user.id).single()
Apres : .eq('user_id', session.user.id).maybeSingle()
```

Aucun autre fichier a modifier pour cette correction.

