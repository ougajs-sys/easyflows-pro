# Guide de Configuration des Notifications Push PWA

## Vue d'ensemble

Ce guide explique comment configurer les notifications push pour EasyFlows Pro en utilisant Firebase Cloud Messaging (FCM).

## Étapes de Configuration

### 1. Créer un Projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com)
2. Cliquez sur "Ajouter un projet"
3. Suivez les étapes pour créer votre projet
4. Une fois créé, allez dans les paramètres du projet (⚙️ → Paramètres du projet)

### 2. Activer Cloud Messaging

1. Dans la console Firebase, allez dans "Cloud Messaging"
2. Sous "Configuration du SDK Cloud Messaging", notez les informations suivantes:
   - Project ID
   - Sender ID
   - API Key
   - App ID

### 3. Générer un Certificat Web Push (VAPID)

1. Dans les paramètres du projet → onglet "Cloud Messaging"
2. Section "Certificats Web Push"
3. Cliquez sur "Générer une nouvelle paire de clés"
4. Copiez la clé publique (VAPID key)

### 4. Créer un Compte de Service

1. Dans les paramètres du projet → onglet "Comptes de service"
2. Cliquez sur "Générer une nouvelle clé privée"
3. Sélectionnez "JSON"
4. Téléchargez le fichier JSON
5. **IMPORTANT**: Gardez ce fichier en sécurité, ne le committez jamais dans Git!

### 5. Configurer les Variables d'Environnement

Ajoutez ces variables dans votre fichier `.env`:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=votre_api_key
VITE_FIREBASE_AUTH_DOMAIN=votre_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre_project_id
VITE_FIREBASE_STORAGE_BUCKET=votre_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
VITE_FIREBASE_APP_ID=votre_app_id
VITE_FIREBASE_VAPID_KEY=votre_vapid_key
```

### 6. Configurer les Secrets Supabase

Les informations sensibles doivent être stockées dans les secrets Supabase:

#### Via le CLI Supabase:

```bash
# Se connecter à Supabase
supabase login

# Lier votre projet
supabase link --project-ref votre-project-ref

# Ajouter les secrets
supabase secrets set FCM_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
supabase secrets set FCM_PROJECT_ID='votre_project_id'
```

#### Via le Dashboard Supabase:

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans "Edge Functions"
4. Sélectionnez la fonction `send-push-notification`
5. Cliquez sur "Manage secrets"
6. Ajoutez:
   - Nom: `FCM_SERVICE_ACCOUNT_JSON`
   - Valeur: Collez le contenu complet du fichier JSON du compte de service
   - Nom: `FCM_PROJECT_ID`
   - Valeur: Votre Project ID Firebase

### 7. Déployer les Migrations

Appliquez les migrations de base de données:

```bash
supabase db push
```

Cette commande va:
- Créer les tables `user_push_tokens` et `push_log`
- Configurer les triggers pour les notifications automatiques
- Activer l'extension `pg_net`

### 8. Déployer la Fonction Edge

Déployez la fonction de notification push:

```bash
supabase functions deploy send-push-notification
```

### 9. Configurer les Settings de la Base de Données

Vous devez configurer les paramètres de connexion pour pg_net. Exécutez ces commandes SQL dans votre base de données Supabase:

```sql
-- Configurer l'URL de Supabase pour pg_net
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://votre-project-ref.supabase.co';

-- Configurer la clé API publique pour pg_net
ALTER DATABASE postgres SET app.settings.supabase_anon_key = 'votre_supabase_anon_key';
```

**Note**: Remplacez `votre-project-ref` et `votre_supabase_anon_key` par vos valeurs réelles.

### 10. Tester les Notifications

#### Test Manuel:

1. Connectez-vous à l'application
2. Allez dans votre Profil
3. Activez les notifications push
4. Créez une nouvelle commande (si admin/superviseur)
5. Vérifiez que vous recevez une notification

#### Test SQL:

```sql
-- Envoyer une notification de test
SELECT public.send_push_notification(
  p_user_ids := ARRAY['votre-user-id'],
  p_title := 'Test de notification',
  p_body := 'Ceci est une notification de test',
  p_data := '{"test": true}'::jsonb,
  p_type := 'test'
);

-- Vérifier les logs
SELECT * FROM push_log ORDER BY created_at DESC LIMIT 10;
```

## Vérification de la Configuration

### 1. Vérifier que pg_net est activé:

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```

### 2. Vérifier les tables:

```sql
-- Table des tokens
SELECT * FROM user_push_tokens LIMIT 5;

-- Table des logs
SELECT * FROM push_log ORDER BY created_at DESC LIMIT 10;
```

### 3. Vérifier les triggers:

```sql
-- Lister tous les triggers push
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE 'trigger_push%';
```

## Dépannage

### Les notifications ne s'affichent pas

1. **Vérifier les permissions du navigateur**:
   - Ouvrir les paramètres du navigateur
   - Chercher "Notifications"
   - S'assurer que le site est autorisé

2. **Vérifier la console du navigateur**:
   - Ouvrir DevTools (F12)
   - Onglet Console
   - Chercher les erreurs liées à Firebase ou aux notifications

3. **Vérifier le Service Worker**:
   - DevTools → Application → Service Workers
   - S'assurer que le service worker est actif

4. **Vérifier les logs Supabase**:
   ```bash
   supabase functions logs send-push-notification
   ```

### Erreur "Invalid token"

Les tokens invalides sont automatiquement supprimés. L'utilisateur doit:
1. Désactiver les notifications dans son profil
2. Réactiver les notifications
3. Un nouveau token sera généré

### Les triggers ne se déclenchent pas

1. Vérifier que pg_net est bien configuré:
   ```sql
   SHOW app.settings.supabase_url;
   SHOW app.settings.supabase_anon_key;
   ```

2. Vérifier les logs de la fonction:
   ```sql
   SELECT * FROM push_log WHERE status = 'failed' ORDER BY created_at DESC;
   ```

## Maintenance

### Nettoyer les anciens logs

Créez un job CRON pour nettoyer les logs:

```sql
-- Supprimer les logs de plus de 30 jours
DELETE FROM push_log WHERE created_at < NOW() - INTERVAL '30 days';
```

### Surveiller l'utilisation

```sql
-- Nombre de notifications par type (dernier mois)
SELECT 
  type,
  COUNT(*) as count,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as success,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM push_log
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY type
ORDER BY count DESC;

-- Utilisateurs avec le plus de tokens
SELECT 
  user_id,
  COUNT(*) as token_count
FROM user_push_tokens
WHERE is_enabled = true
GROUP BY user_id
ORDER BY token_count DESC
LIMIT 10;
```

## Sécurité

⚠️ **Important**:

1. **Ne jamais committer** les secrets Firebase dans Git
2. **Utiliser uniquement** les secrets Supabase pour les clés privées
3. **HTTPS requis**: Les notifications push ne fonctionnent qu'en HTTPS
4. **RLS activé**: Les politiques de sécurité empêchent l'accès non autorisé aux tokens

## Support

Pour plus d'informations:
- [Documentation Firebase](https://firebase.google.com/docs/cloud-messaging)
- [Documentation Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Documentation pg_net](https://supabase.github.io/pg_net/)

## Checklist de Déploiement

- [ ] Projet Firebase créé
- [ ] Cloud Messaging activé
- [ ] Certificat VAPID généré
- [ ] Compte de service créé et téléchargé
- [ ] Variables d'environnement configurées
- [ ] Secrets Supabase configurés
- [ ] Migrations appliquées
- [ ] Fonction Edge déployée
- [ ] Settings pg_net configurés
- [ ] Tests de notification réussis
- [ ] Documentation lue et comprise
