# Quick Test Guide - Push Notifications

## Prérequis

- ✅ Firebase projet configuré
- ✅ Secrets Supabase configurés (FCM_SERVICE_ACCOUNT_JSON, FCM_PROJECT_ID)
- ✅ Variables d'environnement Firebase dans .env
- ✅ Migrations appliquées (`supabase db push`)
- ✅ Edge Function déployée (`supabase functions deploy send-push-notification`)
- ✅ pg_net settings configurés

## Test 1: Enregistrement du Token

### Étapes:
1. Se connecter à l'application
2. Ouvrir DevTools (F12) → Console
3. Vérifier les messages:
   - "Requesting notification permission"
   - "Push notification token registered"

### Vérification SQL:
```sql
SELECT * FROM user_push_tokens WHERE user_id = 'votre-user-id';
```

**Résultat attendu**: 1 ligne avec `is_enabled = true`

## Test 2: Notification de Nouvelle Commande

### Étapes:
1. Se connecter en tant qu'admin ou superviseur
2. S'assurer que les notifications sont activées
3. Créer une nouvelle commande via l'interface
4. Observer la notification qui apparaît

### Vérification SQL:
```sql
-- Vérifier le log de notification
SELECT * FROM push_log 
WHERE type = 'new_order' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Résultat attendu**: 
- Notification affichée dans le navigateur
- Log avec `status = 'sent'`

## Test 3: Notification d'Assignation Appelant

### Étapes:
1. Ouvrir deux navigateurs/onglets:
   - Tab 1: Admin/Superviseur
   - Tab 2: Appelant (avec notifications activées)
2. Dans Tab 1: Assigner une commande à l'appelant
3. Dans Tab 2: Observer la notification

### Vérification SQL:
```sql
-- Vérifier le log de notification
SELECT * FROM push_log 
WHERE type = 'assigned_caller' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Résultat attendu**: Notification reçue par l'appelant

## Test 4: Notification de Livraison

### Étapes:
1. Ouvrir deux navigateurs/onglets:
   - Tab 1: Admin/Superviseur
   - Tab 2: Livreur (avec notifications activées)
2. Dans Tab 1: Assigner une commande à un livreur
3. Dans Tab 2: Observer la notification

### Vérification SQL:
```sql
-- Vérifier le log de notification
SELECT * FROM push_log 
WHERE type = 'assigned_delivery' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Résultat attendu**: Notification reçue par le livreur

## Test 5: Notification de Message

### Étapes:
1. Ouvrir deux navigateurs/onglets avec deux utilisateurs différents
2. Envoyer un message de User A à User B
3. Vérifier que User B reçoit la notification

### Vérification SQL:
```sql
-- Vérifier le log de notification
SELECT * FROM push_log 
WHERE type = 'new_message' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Résultat attendu**: Notification reçue par le destinataire

## Test 6: Activation/Désactivation

### Étapes:
1. Aller dans Profil → Notifications Push
2. Désactiver les notifications (toggle OFF)
3. Créer une commande (si admin)
4. Vérifier qu'aucune notification n'est reçue
5. Réactiver les notifications (toggle ON)
6. Créer une autre commande
7. Vérifier que la notification est reçue

### Vérification SQL:
```sql
-- Vérifier le statut
SELECT is_enabled FROM user_push_tokens WHERE user_id = 'votre-user-id';
```

## Test 7: Notification Manuel (SQL)

### Commande SQL:
```sql
-- Remplacer 'votre-user-id' par un vrai UUID
SELECT public.send_push_notification(
  p_user_ids := ARRAY['votre-user-id'],
  p_title := 'Test Manuel',
  p_body := 'Ceci est un test manuel de notification',
  p_data := '{"test": true, "timestamp": "2026-02-09"}'::jsonb,
  p_type := 'manual_test'
);

-- Vérifier le log
SELECT * FROM push_log 
WHERE type = 'manual_test' 
ORDER BY created_at DESC;
```

**Résultat attendu**: Notification affichée immédiatement

## Test 8: Service Worker

### Vérification DevTools:
1. Ouvrir DevTools → Application → Service Workers
2. Vérifier que le service worker est:
   - ✅ Installé
   - ✅ Activé
   - ✅ En cours d'exécution

### Test d'événement:
```javascript
// Dans la console du navigateur
navigator.serviceWorker.ready.then((registration) => {
  console.log('Service Worker Status:', registration.active ? 'Active' : 'Inactive');
});
```

## Test 9: Permissions du Navigateur

### Vérification:
```javascript
// Dans la console du navigateur
console.log('Notification Permission:', Notification.permission);
console.log('Push Support:', 'PushManager' in window);
console.log('Service Worker Support:', 'serviceWorker' in navigator);
```

**Résultats attendus**:
- `Notification.permission`: "granted"
- `Push Support`: true
- `Service Worker Support`: true

## Test 10: Logs Edge Function

### Commande CLI:
```bash
# Voir les logs en temps réel
supabase functions logs send-push-notification --follow

# Ou via le dashboard Supabase:
# Edge Functions → send-push-notification → Logs
```

## Dépannage Rapide

### Problème: Pas de notification
✅ Vérifier permission navigateur (Notification.permission === 'granted')
✅ Vérifier service worker actif (DevTools → Application)
✅ Vérifier token enregistré (user_push_tokens)
✅ Vérifier logs Edge Function (erreurs FCM?)

### Problème: Token invalide
✅ Désactiver et réactiver notifications dans le profil
✅ Nouveau token sera automatiquement généré

### Problème: Trigger ne se déclenche pas
✅ Vérifier pg_net settings:
```sql
SHOW app.settings.supabase_url;
SHOW app.settings.supabase_anon_key;
```
✅ Si NULL, exécuter les commandes ALTER DATABASE

### Problème: Erreur FCM
✅ Vérifier secrets Supabase (FCM_SERVICE_ACCOUNT_JSON, FCM_PROJECT_ID)
✅ Vérifier que le service account a les bonnes permissions
✅ Vérifier logs Edge Function pour détails d'erreur

## Statistiques Utiles

```sql
-- Nombre total de tokens actifs
SELECT COUNT(*) FROM user_push_tokens WHERE is_enabled = true;

-- Notifications par type (dernières 24h)
SELECT 
  type,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as success,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM push_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY type;

-- Utilisateurs avec notifications actives par rôle
SELECT 
  ur.role,
  COUNT(DISTINCT upt.user_id) as active_users
FROM user_push_tokens upt
JOIN user_roles ur ON upt.user_id = ur.user_id
WHERE upt.is_enabled = true
GROUP BY ur.role;
```

## Checklist de Test Complet

- [ ] Token enregistré avec succès
- [ ] Service Worker actif
- [ ] Permission navigateur accordée
- [ ] Notification nouvelle commande (admin/superviseur)
- [ ] Notification assignation appelant
- [ ] Notification assignation livreur
- [ ] Notification nouveau message
- [ ] Activation/désactivation fonctionne
- [ ] Notification manuelle SQL fonctionne
- [ ] Logs Edge Function accessibles
- [ ] Token invalide supprimé automatiquement
- [ ] Click sur notification navigue correctement

---

**Note**: Ce guide suppose que tous les prérequis de configuration ont été complétés selon `docs/SETUP_PUSH_NOTIFICATIONS.md`
