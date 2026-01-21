# 🔒 Security Policy - EasyFlows Pro

## Table des matières
- [Vue d'ensemble](#vue-densemble)
- [Sécurité des webhooks](#sécurité-des-webhooks)
- [Protection des données](#protection-des-données)
- [Authentification et autorisation](#authentification-et-autorisation)
- [Rate Limiting](#rate-limiting)
- [Monitoring et alertes](#monitoring-et-alertes)
- [Rapporter une vulnérabilité](#rapporter-une-vulnérabilité)

## Vue d'ensemble

EasyFlows Pro implémente plusieurs couches de sécurité pour protéger les données et prévenir les attaques:

### ✅ Mesures de sécurité implémentées

1. **Webhook Signature Verification** - HMAC-SHA256
2. **Row Level Security (RLS)** - Isolation des données par utilisateur
3. **Rate Limiting** - Protection contre les attaques DDOS
4. **Input Validation** - Zod schemas pour validation stricte
5. **Audit Logging** - Traçabilité de toutes les actions
6. **Error Monitoring** - Sentry pour détecter les problèmes
7. **Environment Variables** - Secrets protégés et non exposés

---

## Sécurité des webhooks

### Configuration requise

#### 1. Génération du secret webhook

```bash
# Générer un secret sécurisé (32+ caractères)
openssl rand -hex 32
```

#### 2. Configuration dans Supabase

Ajouter dans les **Environment Variables** de votre projet Supabase:

```
WEBHOOK_SECRET=your-generated-secret-here
```

#### 3. Configuration du service externe (Elementor, WooCommerce, etc.)

Ajouter le header suivant dans votre webhook:

```
X-Webhook-Signature: <HMAC-SHA256 signature>
```

### Génération de la signature (exemple PHP pour Elementor)

```php
<?php
// Dans votre plugin WordPress/Elementor
function generate_webhook_signature($payload, $secret) {
    $json_payload = json_encode($payload);
    return hash_hmac('sha256', $json_payload, $secret);
}

// Lors de l'envoi du webhook
$payload = [
    'phone' => '0612345678',
    'product_name' => 'Mon produit',
    'client_name' => 'Jean Dupont',
    // ...
];

$secret = 'your-webhook-secret';
$signature = generate_webhook_signature($payload, $secret);

// Envoyer avec le header
$headers = [
    'Content-Type: application/json',
    'X-Webhook-Signature: ' . $signature
];
```

### Génération de la signature (exemple JavaScript)

```javascript
// Pour un webhook depuis Node.js
const crypto = require('crypto');

function generateSignature(payload, secret) {
  const jsonPayload = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', secret)
    .update(jsonPayload)
    .digest('hex');
}

// Utilisation
const payload = {
  phone: '0612345678',
  product_name: 'Mon produit',
  client_name: 'Jean Dupont',
};

const signature = generateSignature(payload, process.env.WEBHOOK_SECRET);

// Envoyer avec fetch
fetch('https://your-project.supabase.co/functions/v1/webhook-orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Webhook-Signature': signature,
  },
  body: JSON.stringify(payload),
});
```

### Vérification

Le webhook vérifie automatiquement:
1. ✅ Présence de la signature
2. ✅ Validité de la signature HMAC
3. ✅ Timestamp (< 5 minutes pour éviter replay attacks)

---

## Protection des données

### Row Level Security (RLS)

Toutes les tables critiques ont des policies RLS:

#### Isolation par utilisateur

```sql
-- Les utilisateurs voient SEULEMENT leurs données
CREATE POLICY "users_own_data" ON orders
FOR SELECT USING (auth.uid() = user_id);
```

#### Rôles et permissions

- **Admin**: Accès complet à toutes les données
- **Supervisor**: Lecture de toutes les données, modification limitée
- **User**: Lecture/modification de ses propres données uniquement

### Données sensibles

#### ❌ Jamais stocker en clair:
- Mots de passe (utiliser bcrypt/argon2)
- Numéros de carte bancaire complets
- Secrets API

#### ✅ Toujours masquer dans les logs:
```typescript
// Automatiquement masqué par notre système de logging
logger.info("Paiement reçu", {
  card_number: "1234****5678",  // Masqué automatiquement
  token: "***REDACTED***"
});
```

---

## Authentification et autorisation

### Authentification Supabase

```typescript
// Connexion sécurisée
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password'
});

// Les tokens sont automatiquement gérés
// JWT avec expiration courte (1h)
// Refresh token pour renouvellement
```

### Sessions

- **Expiration**: 1 heure
- **Refresh**: Automatique
- **Stockage**: HttpOnly cookies (pas de localStorage)

---

## Rate Limiting

### Configuration par défaut

```typescript
// 60 requêtes par minute par IP
const config = {
  maxRequests: 60,
  windowMs: 60000, // 1 minute
};
```

### Par endpoint

| Endpoint | Limite | Fenêtre |
|----------|--------|---------|
| Webhooks | 60/min | 1 min |
| API Auth | 10/min | 1 min |
| API Data | 100/min | 1 min |

### En cas de dépassement

```json
{
  "success": false,
  "error": "Trop de requêtes, veuillez réessayer plus tard",
  "retry_after": 60
}
```

**Status code**: 429 (Too Many Requests)

---

## Monitoring et alertes

### Sentry Configuration

```env
VITE_SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-auth-token
```

### Types d'alertes

1. **Erreurs critiques** (Email + Slack)
   - Erreurs 500
   - Database connection lost
   - Security violations

2. **Avertissements** (Slack uniquement)
   - Rate limit dépassé
   - Webhook signature invalide
   - Performance degraded

3. **Info** (Dashboard uniquement)
   - Nouvelles commandes
   - Utilisateurs connectés

### Health Check

```bash
# Vérifier la santé de l'application
curl https://your-project.supabase.co/functions/v1/health
```

**Réponse:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-21T08:00:00Z",
  "version": "1.0.0",
  "checks": {
    "database": true,
    "api": true
  },
  "uptime": 3600000
}
```

---

## Rapporter une vulnérabilité

### 🚨 Processus de signalement

Si vous découvrez une vulnérabilité de sécurité:

1. **NE PAS** créer une issue publique GitHub
2. Envoyer un email à: **ougajs@gmail.com**
3. Inclure:
   - Description détaillée
   - Steps to reproduce
   - Impact potentiel
   - Proof of concept (si applicable)

### Délais de réponse

- **Accusé de réception**: 24-48 heures
- **Évaluation initiale**: 7 jours
- **Patch si critique**: 24-72 heures
- **Patch si non-critique**: 30 jours

### Divulgation responsable

Nous suivons le principe de **divulgation coordonnée**:
- Vous nous donnez le temps de patcher
- Nous vous créditons (si souhaité)
- Divulgation publique après patch

---

## Checklist de sécurité pour les développeurs

### Avant chaque déploiement

- [ ] Aucun secret dans le code
- [ ] Variables d'environnement configurées
- [ ] Tests de sécurité passés
- [ ] RLS policies testées
- [ ] Webhooks signature vérifiée
- [ ] Logs nettoyés (pas de données sensibles)
- [ ] Sentry configuré
- [ ] Rate limiting actif

### En production

- [ ] HTTPS activé (Supabase/Vercel le fait automatiquement)
- [ ] CORS configuré correctement
- [ ] Backup automatique configuré
- [ ] Monitoring actif
- [ ] Alertes configurées

---

## Ressources

### Documentation

- [Supabase Security](https://supabase.com/docs/guides/auth)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Sentry Best Practices](https://docs.sentry.io/product/best-practices/)

### Outils de test

```bash
# Tester les webhooks localement
curl -X POST https://your-project.supabase.co/functions/v1/webhook-orders \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: your-signature" \
  -d '{"phone":"0612345678","product_name":"Test"}'
```

---

## Contact

**Email sécurité**: ougajs@gmail.com  
**Project maintainer**: ougajs-sys

---

*Dernière mise à jour: 21 janvier 2026*
