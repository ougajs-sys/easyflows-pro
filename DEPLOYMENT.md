# 🚀 Deployment Guide - EasyFlows Pro

## Table des matières
- [Prérequis](#prérequis)
- [Configuration Vercel](#configuration-vercel)
- [Configuration Supabase](#configuration-supabase)
- [Configuration Sentry](#configuration-sentry)
- [Variables d'environnement](#variables-denvironnement)
- [Déploiement](#déploiement)
- [Post-déploiement](#post-déploiement)
- [Rollback](#rollback)

---

## Prérequis

### Comptes requis

1. ✅ **GitHub** - Repository du code
2. ✅ **Vercel** - Hosting frontend
3. ✅ **Supabase** - Backend et base de données
4. ✅ **Sentry** (optionnel) - Monitoring des erreurs
5. ✅ **Messenger360** - API SMS (si applicable)

### Outils requis

```bash
# Node.js 18+
node --version

# Git
git --version

# Vercel CLI (optionnel)
npm install -g vercel

# Supabase CLI (optionnel)
npm install -g supabase
```

---

## Configuration Vercel

### 1. Import du projet

1. Aller sur [vercel.com](https://vercel.com)
2. Cliquer sur **"New Project"**
3. Importer depuis GitHub: `ougajs-sys/easyflows-pro`
4. Sélectionner le framework: **Vite**

### 2. Configuration Build

```bash
# Build Command
npm run build

# Output Directory
dist

# Install Command
npm install
```

### 3. Variables d'environnement

Dans les **Project Settings** → **Environment Variables**:

```env
# Supabase
VITE_SUPABASE_PROJECT_ID=qpxzuglvvfvookzmpgfe
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_URL=https://qpxzuglvvfvookzmpgfe.supabase.co

# Sentry (optionnel)
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Application
VITE_APP_URL=https://easyflow-pro.site
```

### 4. Domaine personnalisé

1. **Settings** → **Domains**
2. Ajouter: `easyflow-pro.site`
3. Configurer les DNS:

```
Type  Name  Value
A     @     76.76.21.21
CNAME www   cname.vercel-dns.com
```

### 5. Configuration avancée

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "outputDirectory": "dist",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://qpxzuglvvfvookzmpgfe.supabase.co/functions/v1/:path*"
    }
  ]
}
```

---

## Configuration Supabase

### 1. Projet existant

**Project ID**: `qpxzuglvvfvookzmpgfe`  
**Region**: `eu-west-1` (Europe)

### 2. Variables d'environnement (Edge Functions)

Dans **Project Settings** → **Edge Functions** → **Environment Variables**:

```env
# Webhook Security
WEBHOOK_SECRET=your-secure-random-secret-min-32-chars

# Messenger360 API
MESSENGER360_API_KEY=0XKinPxbcHiUXvDf7QNKBtPfE2zy2bBAqwo
MESSENGER360_API_URL=https://api.messenger360.com/v1

# Sentry (pour les Edge Functions)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=60
RATE_LIMIT_WINDOW_MS=60000
```

### 3. Migrations de base de données

```bash
# Se connecter au projet
supabase login

# Lier au projet existant
supabase link --project-ref qpxzuglvvfvookzmpgfe

# Appliquer les migrations
supabase db push

# Vérifier les migrations appliquées
supabase db remote status
```

### 4. Déployer les Edge Functions

```bash
# Déployer toutes les fonctions
supabase functions deploy webhook-orders
supabase functions deploy health
supabase functions deploy send-notification-sms
supabase functions deploy send-sms
supabase functions deploy ai-agent
supabase functions deploy process-auto-followups
supabase functions deploy process-scheduled-campaigns

# Ou déployer toutes en une fois
for func in $(ls supabase/functions); do
  supabase functions deploy $func
done
```

### 5. Configuration RLS

Les policies sont automatiquement appliquées via les migrations.

Vérifier:

```sql
-- Dans le SQL Editor de Supabase
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

---

## Configuration Sentry

### 1. Créer le projet

1. Aller sur [sentry.io](https://sentry.io)
2. **Projects** → **Create Project**
3. Plateforme: **React**
4. Nom: `easyflows-pro`

### 2. Configuration GitHub OAuth

1. **Settings** → **Integrations**
2. Activer **GitHub**
3. Autoriser l'accès au repository

### 3. Source Maps

```bash
# Installation
npm install --save-dev @sentry/vite-plugin

# Configuration dans vite.config.ts
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: "your-sentry-org",
      project: "easyflows-pro",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
```

### 4. Releases

```bash
# Lors du déploiement
export SENTRY_AUTH_TOKEN=your-auth-token
npm run build

# Les source maps sont automatiquement uploadées
```

---

## Variables d'environnement

### Production (.env.production)

```env
# ============================================
# PRODUCTION ENVIRONMENT VARIABLES
# ============================================

# Supabase
VITE_SUPABASE_PROJECT_ID=qpxzuglvvfvookzmpgfe
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_URL=https://qpxzuglvvfvookzmpgfe.supabase.co

# Application
VITE_APP_URL=https://easyflow-pro.site
NODE_ENV=production

# Sentry
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=easyflows-pro

# Features
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

### Staging (.env.staging)

```env
# ============================================
# STAGING ENVIRONMENT VARIABLES
# ============================================

VITE_SUPABASE_PROJECT_ID=qpxzuglvvfvookzmpgfe
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_URL=https://qpxzuglvvfvookzmpgfe.supabase.co

VITE_APP_URL=https://staging-easyflow-pro.vercel.app
NODE_ENV=staging

VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

---

## Déploiement

### Méthode 1: Git Push (Recommandé)

```bash
# Pousser sur la branche main
git add .
git commit -m "Release v1.0.0"
git push origin main

# Vercel déploie automatiquement
# URL: https://easyflow-pro.site
```

### Méthode 2: Vercel CLI

```bash
# Déploiement vers production
vercel --prod

# Déploiement vers preview
vercel
```

### Méthode 3: GitHub Actions (CI/CD)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_PROJECT_ID: ${{ secrets.VITE_SUPABASE_PROJECT_ID }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Post-déploiement

### 1. Vérifications

```bash
# Health check
curl https://easyflow-pro.site/api/health

# Test webhook
curl -X POST https://qpxzuglvvfvookzmpgfe.supabase.co/functions/v1/webhook-orders \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: test-signature" \
  -d '{"phone":"0612345678","product_name":"Test"}'

# Check Sentry
# Aller sur sentry.io et vérifier les events
```

### 2. Monitoring

```bash
# Vercel Analytics
# Dashboard: https://vercel.com/ougajs-sys/easyflows-pro/analytics

# Sentry Performance
# Dashboard: https://sentry.io/organizations/your-org/performance/

# Supabase Logs
# Dashboard: https://app.supabase.com/project/qpxzuglvvfvookzmpgfe/logs
```

### 3. Tests fumée (Smoke tests)

- [ ] Page d'accueil charge
- [ ] Login fonctionne
- [ ] Dashboard affiche les données
- [ ] Créer une commande
- [ ] Webhook reçoit les données
- [ ] SMS envoyé (si configuré)
- [ ] Aucune erreur dans Sentry

---

## Rollback

### Méthode 1: Vercel Dashboard

1. Aller sur [vercel.com/dashboard](https://vercel.com/dashboard)
2. Sélectionner **easyflows-pro**
3. **Deployments** → Trouver le déploiement précédent
4. Cliquer sur **...** → **Promote to Production**

### Méthode 2: Git Revert

```bash
# Trouver le commit à revert
git log --oneline

# Revert le commit
git revert <commit-hash>

# Pousser
git push origin main

# Vercel redéploie automatiquement
```

### Méthode 3: Vercel CLI

```bash
# Lister les déploiements
vercel ls

# Promouvoir un déploiement précédent
vercel promote <deployment-url>
```

---

## Troubleshooting

### Build errors

```bash
# Nettoyer le cache
rm -rf node_modules dist
npm install
npm run build

# Vérifier les types
npm run type-check
```

### Runtime errors

```bash
# Vérifier les logs Vercel
vercel logs

# Vérifier les logs Supabase
supabase functions logs webhook-orders

# Vérifier Sentry
# https://sentry.io/organizations/your-org/issues/
```

### Environment variables

```bash
# Lister les variables
vercel env ls

# Ajouter une variable
vercel env add VITE_NEW_VAR

# Supprimer une variable
vercel env rm VITE_OLD_VAR
```

---

## Checklist de déploiement

### Pré-déploiement

- [ ] Tests passés localement
- [ ] Build réussi localement
- [ ] Variables d'environnement configurées
- [ ] Migrations de base de données appliquées
- [ ] Documentation à jour
- [ ] CHANGELOG.md mis à jour

### Déploiement

- [ ] Code poussé sur main
- [ ] Vercel build réussi
- [ ] Edge Functions déployées
- [ ] Domaine accessible
- [ ] HTTPS actif

### Post-déploiement

- [ ] Health check OK
- [ ] Tests fumée passés
- [ ] Monitoring actif
- [ ] Alertes configurées
- [ ] Équipe notifiée

---

## Support

**Email**: ougajs@gmail.com  
**Project**: [github.com/ougajs-sys/easyflows-pro](https://github.com/ougajs-sys/easyflows-pro)

---

*Dernière mise à jour: 21 janvier 2026*
