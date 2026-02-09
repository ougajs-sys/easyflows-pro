# Implémentation du Système de Notifications Push PWA

## Résumé

Un système complet de notifications push a été implémenté pour EasyFlows Pro en utilisant Firebase Cloud Messaging (FCM) HTTP v1 API. Le système est activé par défaut avec possibilité de désactivation dans le profil utilisateur.

## Composants Implémentés

### 1. Base de Données (Migrations SQL)

**Fichier**: `supabase/migrations/20260209175145_pwa_push_notifications.sql`

#### Tables Créées:

1. **`user_push_tokens`** - Stockage des tokens FCM
   - `id` (UUID, PK)
   - `user_id` (UUID, FK vers auth.users)
   - `token` (TEXT, token FCM)
   - `platform` (TEXT, défaut 'web')
   - `is_enabled` (BOOLEAN, défaut true)
   - `last_seen_at` (TIMESTAMPTZ)
   - `created_at` (TIMESTAMPTZ)
   - Index unique sur `(user_id, token)`

2. **`push_log`** - Historique des notifications
   - `id` (UUID, PK)
   - `user_id` (UUID, FK vers auth.users)
   - `type` (TEXT, type de notification)
   - `payload` (JSONB, données de la notification)
   - `status` (TEXT, statut d'envoi)
   - `created_at` (TIMESTAMPTZ)

#### Triggers Automatiques:

1. **`trigger_push_new_order`** - Nouvelles commandes
   - Déclenché: AFTER INSERT sur `orders`
   - Destinataires: Tous les administrateurs et superviseurs
   - Message enrichi: order_number, client_name, product_name, total_amount

2. **`trigger_push_assigned_caller`** - Assignation appelant
   - Déclenché: AFTER UPDATE OF `assigned_to` sur `orders`
   - Destinataire: Utilisateur assigné (assigned_to)
   - Message enrichi: order_number, client_name, product_name, total_amount

3. **`trigger_push_assigned_delivery`** - Assignation livreur
   - Déclenché: AFTER UPDATE OF `delivery_person_id` sur `orders`
   - Destinataire: Livreur assigné (via delivery_persons.user_id)
   - Message enrichi: order_number, client_name, product_name, delivery_address

4. **`trigger_push_new_message`** - Nouveaux messages
   - Déclenché: AFTER INSERT sur `messages`
   - Destinataire: receiver_id du message
   - Message enrichi: Nom de l'expéditeur (profiles.full_name)

#### Fonction SQL Helper:

**`send_push_notification()`** - Fonction pour envoyer des notifications
- Paramètres: user_ids[], title, body, data, type
- Appelle l'Edge Function via pg_net
- Enregistre dans push_log

### 2. Edge Function

**Fichier**: `supabase/functions/send-push-notification/index.ts`

#### Fonctionnalités:

- **Authentification FCM HTTP v1**: Génération de tokens OAuth2 via Service Account
- **Envoi de notifications**: Utilise l'API FCM v1
- **Gestion des erreurs**: Supprime automatiquement les tokens invalides
- **Logging**: Enregistre tous les envois dans la base de données
- **Sécurité**: Utilise des secrets Supabase (pas de commit de credentials)

#### Secrets Requis:
- `FCM_SERVICE_ACCOUNT_JSON`: Contenu complet du fichier JSON du compte de service
- `FCM_PROJECT_ID`: ID du projet Firebase

### 3. Frontend

#### Service Worker Personnalisé

**Fichier**: `src/service-worker.ts`

- Gestion des événements push FCM
- Affichage des notifications
- Gestion des clics sur les notifications
- Navigation vers les pages appropriées

#### Configuration Firebase

**Fichier**: `src/config/firebase.ts`

- Configuration Firebase depuis variables d'environnement
- VAPID key pour Web Push

#### Hooks React

1. **`usePushNotifications`** (`src/hooks/usePushNotifications.ts`)
   - Gestion complète des notifications push
   - Demande de permission
   - Enregistrement du token FCM
   - Activation/désactivation des notifications

2. **`useInitializePushNotifications`** (`src/hooks/useInitializePushNotifications.ts`)
   - Initialisation automatique au chargement de l'app
   - Demande de permission après 2 secondes (première connexion)
   - Rafraîchissement silencieux des tokens

#### Composant UI

**Fichier**: `src/components/profile/PushNotificationSettings.tsx`

- Affichage du statut des notifications
- Toggle pour activer/désactiver
- Bouton pour demander la permission
- Liste des événements notifiés

#### Intégration dans l'App

**Fichier**: `src/App.tsx`

- Initialisation automatique des notifications
- Intégration dans le cycle de vie de l'app

### 4. Configuration Vite

**Fichier**: `vite.config.ts`

- Configuration du plugin PWA avec service worker personnalisé
- Mode `injectManifest` pour utiliser notre service worker
- Activation du mode développement pour les tests

### 5. Dépendances Ajoutées

**Fichier**: `package.json`

```json
{
  "firebase": "^10.8.0",
  "workbox-precaching": "^7.0.0",
  "workbox-window": "^7.0.0"
}
```

### 6. Configuration Supabase

**Fichier**: `supabase/config.toml`

Ajout de la fonction `send-push-notification` avec `verify_jwt = false`

### 7. Documentation

#### Fichiers Créés:

1. **`docs/PUSH_NOTIFICATIONS.md`**: Documentation technique complète
   - Architecture du système
   - Guide de setup
   - Utilisation
   - Dépannage
   - Maintenance

2. **`docs/SETUP_PUSH_NOTIFICATIONS.md`**: Guide de configuration en français
   - Étapes détaillées de configuration Firebase
   - Configuration des secrets Supabase
   - Déploiement des migrations et fonctions
   - Tests et vérification
   - Checklist de déploiement

3. **`.env.example`**: Variables d'environnement ajoutées
   ```bash
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   VITE_FIREBASE_VAPID_KEY=
   ```

## Flux de Fonctionnement

### 1. Enregistrement de l'Utilisateur

```
Utilisateur se connecte
    ↓
useInitializePushNotifications (auto)
    ↓
Demande permission navigateur (si première fois)
    ↓
Firebase génère un token FCM
    ↓
Token enregistré dans user_push_tokens
```

### 2. Envoi de Notification

```
Événement se produit (nouvelle commande, etc.)
    ↓
Trigger SQL détecte l'événement
    ↓
send_push_notification() appelée
    ↓
pg_net → Edge Function send-push-notification
    ↓
Edge Function → FCM HTTP v1 API
    ↓
FCM → Service Worker du navigateur
    ↓
Service Worker affiche la notification
    ↓
Utilisateur clique → Navigation vers la page
```

### 3. Gestion des Tokens

```
Token enregistré avec is_enabled = true
    ↓
Utilisateur désactive dans profil
    ↓
is_enabled = false (token gardé)
    ↓
Pas de notifications envoyées
    ↓
Utilisateur réactive
    ↓
is_enabled = true (token réutilisé ou nouveau)
```

## Types de Notifications

| Type | Événement | Destinataires | Données Incluses |
|------|-----------|---------------|------------------|
| `new_order` | Nouvelle commande créée | Admins + Superviseurs | order_number, client_name, product_name, total_amount |
| `assigned_caller` | Commande assignée à un appelant | Appelant assigné | order_number, client_name, product_name, total_amount |
| `assigned_delivery` | Commande assignée à un livreur | Livreur assigné | order_number, client_name, product_name, delivery_address |
| `new_message` | Nouveau message chat 1-to-1 | Destinataire du message | sender_name, message_preview |

## Sécurité

### Mesures Implémentées:

1. **Secrets Supabase**: Credentials FCM jamais committés
2. **RLS Policies**: 
   - Utilisateurs ne peuvent gérer que leurs propres tokens
   - Admins peuvent voir tous les logs
   - Système peut insérer dans push_log
3. **HTTPS Only**: Notifications fonctionnent uniquement en HTTPS
4. **Token Cleanup**: Tokens invalides supprimés automatiquement
5. **SECURITY DEFINER**: Fonctions SQL sécurisées pour accès contrôlé

## Compatibilité Navigateurs

- ✅ Chrome 50+
- ✅ Firefox 44+
- ✅ Edge 17+
- ✅ Safari 16+ (macOS 13+, iOS 16.4+)

## Tests Effectués

1. ✅ Build réussi sans erreurs
2. ✅ TypeScript compilation sans nouveaux warnings
3. ✅ Service Worker correctement généré
4. ✅ Structure de migration SQL valide
5. ✅ Edge Function avec gestion d'erreurs complète

## Prochaines Étapes pour le Déploiement

1. **Configuration Firebase** (5-10 minutes)
   - Créer projet Firebase
   - Activer Cloud Messaging
   - Générer VAPID key
   - Créer compte de service

2. **Configuration Supabase** (5 minutes)
   - Ajouter secrets FCM
   - Appliquer migrations: `supabase db push`
   - Déployer fonction: `supabase functions deploy send-push-notification`

3. **Configuration Base de Données** (2 minutes)
   - Exécuter commandes SQL pour pg_net settings
   - Vérifier que les triggers sont créés

4. **Configuration Frontend** (2 minutes)
   - Ajouter variables Firebase dans `.env`
   - Rebuild: `npm run build`
   - Déployer

5. **Tests** (5 minutes)
   - Se connecter et activer notifications
   - Créer une commande de test
   - Vérifier réception de notification

**Temps total estimé**: 20-30 minutes

## Support et Maintenance

- Logs disponibles dans la table `push_log`
- Surveillance via requêtes SQL (voir documentation)
- Nettoyage automatique recommandé (job CRON)
- Tokens invalides supprimés automatiquement

## Améliorations Futures Possibles

- [ ] Préférences de notification par type
- [ ] Heures de silence configurables
- [ ] Historique des notifications dans l'UI
- [ ] Notifications riches avec images
- [ ] Boutons d'action dans les notifications
- [ ] Support des notifications de groupe

---

**Date d'implémentation**: 9 février 2026
**Version**: 1.0.0
**Statut**: ✅ Prêt pour déploiement
