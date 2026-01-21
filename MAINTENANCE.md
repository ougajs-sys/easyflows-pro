# 🔧 Maintenance Guide - EasyFlows Pro

## Table des matières
- [Tâches quotidiennes](#tâches-quotidiennes)
- [Tâches hebdomadaires](#tâches-hebdomadaires)
- [Tâches mensuelles](#tâches-mensuelles)
- [Monitoring et alertes](#monitoring-et-alertes)
- [Gestion des incidents](#gestion-des-incidents)
- [Backups](#backups)
- [Mise à jour des dépendances](#mise-à-jour-des-dépendances)

---

## Tâches quotidiennes

### 1. Vérification des erreurs

```bash
# Vérifier Sentry pour les nouvelles erreurs
# https://sentry.io/organizations/your-org/issues/

# Vérifier les logs Supabase
# https://app.supabase.com/project/qpxzuglvvfvookzmpgfe/logs

# Vérifier Vercel analytics
# https://vercel.com/ougajs-sys/easyflows-pro/analytics
```

**Checklist:**
- [ ] Aucune erreur critique (5xx)
- [ ] Taux d'erreur < 1%
- [ ] Temps de réponse moyen < 500ms
- [ ] Aucun incident Sentry non résolu

### 2. Health Check

```bash
# Vérifier que l'application fonctionne
curl https://easyflow-pro.site/api/health

# Réponse attendue:
# {
#   "status": "healthy",
#   "checks": {
#     "database": true,
#     "api": true
#   }
# }
```

### 3. Vérification des webhooks

```bash
# Vérifier les logs des webhooks
supabase functions logs webhook-orders --limit 50

# Vérifier qu'il n'y a pas d'erreurs de signature
# Vérifier que les commandes sont créées correctement
```

---

## Tâches hebdomadaires

### 1. Analyse des performances

```bash
# Lighthouse audit
npx lighthouse https://easyflow-pro.site --view

# Vérifier les Core Web Vitals
# LCP < 2.5s
# FID < 100ms
# CLS < 0.1
```

**Actions si nécessaire:**
- Optimiser les images
- Réduire le bundle size
- Améliorer le caching

### 2. Revue des logs d'audit

```sql
-- Dans Supabase SQL Editor
SELECT 
  table_name,
  operation,
  COUNT(*) as count
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY table_name, operation
ORDER BY count DESC;
```

**Vérifier:**
- Pas d'activité suspecte
- Pas de suppressions massives non autorisées
- Pas de modifications inhabituelles

### 3. Backup verification

```bash
# Vérifier que les backups Supabase sont actifs
# Dashboard: Project Settings > Database > Backups

# Tester la restauration (staging uniquement)
supabase db dump -f backup-test.sql
```

### 4. Rate limiting review

```sql
-- Vérifier les IPs bloquées
SELECT 
  identifier,
  COUNT(*) as blocked_requests
FROM rate_limit_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY identifier
HAVING COUNT(*) > 100
ORDER BY blocked_requests DESC;
```

---

## Tâches mensuelles

### 1. Mise à jour des dépendances

```bash
# Vérifier les packages obsolètes
npm outdated

# Mettre à jour les patches et minors
npm update

# Vérifier les vulnérabilités
npm audit

# Fixer les vulnérabilités automatiquement
npm audit fix

# Tester après mise à jour
npm run build
npm run test
```

### 2. Nettoyage de la base de données

```sql
-- Supprimer les logs d'audit anciens (> 90 jours)
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '90 days';

-- Supprimer les sessions expirées
DELETE FROM auth.sessions
WHERE expires_at < NOW();

-- Vacuum pour récupérer l'espace
VACUUM ANALYZE;
```

### 3. Revue de sécurité

**Checklist:**
- [ ] Pas de secrets exposés dans le code
- [ ] Variables d'environnement à jour
- [ ] RLS policies testées
- [ ] Webhook signatures vérifiées
- [ ] Certificats SSL valides
- [ ] Aucune vulnérabilité critique (npm audit)

### 4. Performance tuning

```sql
-- Identifier les requêtes lentes
SELECT 
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
WHERE mean_time > 100 -- Plus de 100ms
ORDER BY total_time DESC
LIMIT 10;

-- Vérifier l'utilisation des index
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read
FROM pg_stat_user_indexes
WHERE idx_scan = 0 -- Index jamais utilisé
ORDER BY pg_relation_size(indexrelid) DESC;
```

### 5. Rapport mensuel

**Générer un rapport avec:**
- Nombre total de commandes
- Taux de conversion
- Temps de réponse moyen
- Taux d'erreur
- Uptime
- Nouveaux utilisateurs

```sql
-- Exemple de requête pour le rapport
SELECT 
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as orders_count,
  AVG(total_amount) as avg_amount,
  SUM(total_amount) as total_revenue
FROM orders
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;
```

---

## Monitoring et alertes

### Configuration Sentry Alerts

#### Erreur critique

```yaml
# Alert: Erreur 500
Conditions:
  - Event type: error
  - Status code: 500
  - Frequency: > 10 in 5 minutes

Actions:
  - Email: ougajs@gmail.com
  - Slack: #alerts
```

#### Performance dégradée

```yaml
# Alert: Temps de réponse élevé
Conditions:
  - Transaction: /api/*
  - Duration: > 3 seconds
  - Frequency: > 5 in 10 minutes

Actions:
  - Slack: #performance
```

#### Rate limit dépassé

```yaml
# Alert: Trop de requêtes
Conditions:
  - Status code: 429
  - Frequency: > 50 in 5 minutes

Actions:
  - Slack: #security
```

### Configuration Vercel Alerts

1. **Project Settings** → **Integrations** → **Notifications**

2. Configurer:
   - Build failures
   - Deployment errors
   - Custom domain issues
   - Function errors

### Uptime Monitoring

**Services recommandés:**

1. **UptimeRobot** (Gratuit)
   - URL: https://easyflow-pro.site
   - Intervalle: 5 minutes
   - Alerte: Email

2. **Pingdom** (Payant)
   - Monitoring avancé
   - Locations multiples
   - Alertes SMS

3. **Better Uptime** (Recommandé)
   - Status page publique
   - Incident management
   - Intégration Slack

### Configuration des alertes

```typescript
// src/lib/alerts.ts
export async function sendAlert(
  severity: 'critical' | 'warning' | 'info',
  title: string,
  message: string
) {
  // Slack webhook
  if (severity === 'critical' || severity === 'warning') {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      body: JSON.stringify({
        text: `[${severity.toUpperCase()}] ${title}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: message,
            },
          },
        ],
      }),
    });
  }

  // Email pour les erreurs critiques
  if (severity === 'critical') {
    await sendEmail({
      to: 'ougajs@gmail.com',
      subject: `[CRITICAL] ${title}`,
      body: message,
    });
  }
}
```

---

## Gestion des incidents

### Processus d'incident

#### 1. Détection

- Alerte Sentry / Monitoring
- Rapport utilisateur
- Tests automatiques

#### 2. Triage

```markdown
# Template d'incident

**Titre:** [INCIDENT] Description courte

**Sévérité:**
- P0 (Critical): Application down
- P1 (High): Fonctionnalité majeure cassée
- P2 (Medium): Fonctionnalité mineure cassée
- P3 (Low): Bug cosmétique

**Impact:**
- Utilisateurs affectés: X%
- Fonctionnalités affectées: [liste]

**Timeline:**
- Détecté: 2026-01-21 10:00 UTC
- Investigation: 2026-01-21 10:05 UTC
- Résolution: 2026-01-21 10:30 UTC

**Root Cause:**
[Description de la cause]

**Resolution:**
[Actions prises]

**Prevention:**
[Comment éviter à l'avenir]
```

#### 3. Investigation

```bash
# Vérifier les logs
vercel logs --follow

# Vérifier Supabase
supabase functions logs webhook-orders --limit 100

# Vérifier Sentry
# https://sentry.io/organizations/your-org/issues/

# Vérifier la base de données
supabase db remote status
```

#### 4. Résolution

**Options:**
1. **Hotfix** - Push direct sur main
2. **Rollback** - Revert au déploiement précédent
3. **Configuration** - Changer les variables d'environnement

#### 5. Post-mortem

**Template:**

```markdown
# Post-mortem: [Titre de l'incident]

**Date:** 2026-01-21
**Duration:** 30 minutes
**Impact:** 5% des utilisateurs

## Chronologie

- 10:00 - Incident détecté
- 10:05 - Investigation commencée
- 10:15 - Cause identifiée
- 10:20 - Fix déployé
- 10:30 - Incident résolu

## Cause racine

[Description détaillée]

## Résolution

[Actions prises]

## Leçons apprises

1. [Leçon 1]
2. [Leçon 2]

## Actions de suivi

- [ ] Action 1 - Responsable - Date
- [ ] Action 2 - Responsable - Date
```

---

## Backups

### Stratégie de backup

#### Supabase (Automatique)

- **Daily backups**: 7 jours de rétention
- **Weekly backups**: 4 semaines de rétention
- **Point-in-time recovery**: Jusqu'à 7 jours

#### Backups manuels

```bash
# Backup de la base de données
supabase db dump -f backup-$(date +%Y%m%d).sql

# Backup des Edge Functions
tar -czf functions-backup-$(date +%Y%m%d).tar.gz supabase/functions/

# Backup du code (Git)
git archive --format=tar.gz -o code-backup-$(date +%Y%m%d).tar.gz HEAD
```

#### Stockage des backups

- **S3 / Cloud Storage** (Recommandé)
- **GitHub Releases** (Pour le code)
- **Local** (Backups temporaires)

### Test de restauration

**Fréquence:** Trimestriel

```bash
# Créer un projet de test
supabase projects create test-restore

# Restaurer le backup
psql -h db.test-restore.supabase.co -U postgres -d postgres < backup.sql

# Vérifier les données
psql -h db.test-restore.supabase.co -U postgres -d postgres -c "SELECT COUNT(*) FROM orders;"

# Supprimer le projet de test
supabase projects delete test-restore
```

---

## Mise à jour des dépendances

### Stratégie de mise à jour

#### Patch versions (x.x.X)

- **Fréquence:** Hebdomadaire
- **Risque:** Faible
- **Process:** Automatique (Dependabot)

```bash
npm update
npm test
git commit -m "chore: update patch dependencies"
```

#### Minor versions (x.X.x)

- **Fréquence:** Mensuelle
- **Risque:** Moyen
- **Process:** Review + Test

```bash
npm outdated
npm update --save
npm run build
npm test
# Test manuel
git commit -m "chore: update minor dependencies"
```

#### Major versions (X.x.x)

- **Fréquence:** Trimestriel
- **Risque:** Élevé
- **Process:** Review + Test complet + Staging

```bash
npm install package@latest
# Review CHANGELOG
# Update code si nécessaire
npm run build
npm test
# Test manuel complet
# Deploy to staging
# Test staging
# Deploy to production
git commit -m "feat: upgrade [package] to v[version]"
```

### Dependabot configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "ougajs-sys"
    labels:
      - "dependencies"
```

---

## Checklist de maintenance

### Quotidien

- [ ] Vérifier Sentry (0 erreurs critiques)
- [ ] Health check OK
- [ ] Logs webhook OK

### Hebdomadaire

- [ ] Performance audit (Lighthouse > 90)
- [ ] Logs d'audit revus
- [ ] Backups vérifiés
- [ ] Rate limiting review

### Mensuel

- [ ] Dépendances mises à jour
- [ ] Base de données nettoyée
- [ ] Revue de sécurité
- [ ] Performance tuning
- [ ] Rapport mensuel généré

---

## Contact

**Maintenance:** ougajs@gmail.com  
**Incidents:** ougajs@gmail.com  
**Urgences:** +33 (0)6 XX XX XX XX

---

*Dernière mise à jour: 21 janvier 2026*
