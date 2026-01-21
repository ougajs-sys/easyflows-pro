# Deployment Guide - EasyFlows Pro

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Vercel Deployment](#vercel-deployment)
4. [Supabase Configuration](#supabase-configuration)
5. [Environment Variables](#environment-variables)
6. [Domain Configuration](#domain-configuration)
7. [Post-Deployment](#post-deployment)
8. [Troubleshooting](#troubleshooting)

## Overview

EasyFlows Pro is deployed on Vercel with Supabase as the backend. This guide covers the complete deployment process.

## Prerequisites

### Required Accounts
- [x] GitHub account (ougajs-sys)
- [x] Vercel account (linked to GitHub)
- [x] Supabase account (Project ID: qpxzuglvvfvookzmpgfe)
- [x] Domain: easyflow-pro.site
- [ ] Sentry account (optional, for monitoring)

### Local Setup
```bash
# Install Node.js 18+ and npm
node --version  # Should be 18+
npm --version

# Clone repository
git clone https://github.com/ougajs-sys/easyflows-pro.git
cd easyflows-pro

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your values
```

## Vercel Deployment

### Method 1: GitHub Integration (Recommended)

1. **Connect Repository**
   ```
   1. Go to https://vercel.com
   2. Click "New Project"
   3. Import GitHub repository: ougajs-sys/easyflows-pro
   4. Vercel auto-detects Vite configuration
   ```

2. **Configure Build Settings**
   ```
   Framework Preset: Vite
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

3. **Set Environment Variables**
   Add these in Vercel dashboard:
   ```
   VITE_SUPABASE_PROJECT_ID=qpxzuglvvfvookzmpgfe
   VITE_SUPABASE_PUBLISHABLE_KEY=[your-anon-key]
   VITE_SUPABASE_URL=https://qpxzuglvvfvookzmpgfe.supabase.co
   VITE_MESSENGER360_API_KEY=[your-api-key]
   WEBHOOK_SECRET=[your-webhook-secret]
   VITE_SENTRY_DSN=[your-sentry-dsn]
   VITE_APP_DOMAIN=easyflow-pro.site
   VITE_APP_EMAIL=ougajs@gmail.com
   ```

4. **Deploy**
   ```
   Click "Deploy"
   Vercel will build and deploy automatically
   ```

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Follow prompts to configure
```

### Automatic Deployments
- **Production**: Deploys on push to `main` branch
- **Preview**: Deploys on push to other branches
- **Pull Requests**: Automatic preview deployments

## Supabase Configuration

### Database Setup

1. **Run Migrations**
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Link project
   supabase link --project-ref qpxzuglvvfvookzmpgfe

   # Run migrations
   supabase db push
   ```

2. **Enable RLS**
   - Migrations automatically enable RLS
   - Verify in Supabase dashboard > Authentication > Policies

### Edge Functions

1. **Deploy Functions**
   ```bash
   # Deploy all functions
   supabase functions deploy webhook-orders
   supabase functions deploy health
   supabase functions deploy send-sms
   supabase functions deploy send-notification-sms
   supabase functions deploy process-scheduled-campaigns
   supabase functions deploy process-auto-followups
   supabase functions deploy ai-agent
   ```

2. **Set Secrets**
   ```bash
   # Webhook secret
   supabase secrets set WEBHOOK_SECRET="your-webhook-secret"
   
   # Messenger360 API key
   supabase secrets set MESSENGER360_API_KEY="0XKinPxbcHiUXvDf7QNKBtPfE2zy2bBAqwo"
   ```

3. **Test Health Endpoint**
   ```bash
   curl https://qpxzuglvvfvookzmpgfe.supabase.co/functions/v1/health
   ```

## Environment Variables

### Production Environment Variables

| Variable | Value | Required |
|----------|-------|----------|
| VITE_SUPABASE_PROJECT_ID | qpxzuglvvfvookzmpgfe | ✅ Yes |
| VITE_SUPABASE_PUBLISHABLE_KEY | [Supabase Anon Key] | ✅ Yes |
| VITE_SUPABASE_URL | https://qpxzuglvvfvookzmpgfe.supabase.co | ✅ Yes |
| VITE_MESSENGER360_API_KEY | 0XKinPxbcHiUXvDf7QNKBtPfE2zy2bBAqwo | ✅ Yes |
| WEBHOOK_SECRET | [Generated Secret] | ✅ Yes |
| VITE_SENTRY_DSN | [Sentry DSN] | ⚠️ Recommended |
| VITE_APP_DOMAIN | easyflow-pro.site | ✅ Yes |
| VITE_APP_EMAIL | ougajs@gmail.com | ✅ Yes |

### Getting Keys

#### Supabase Keys
```
1. Go to https://app.supabase.com
2. Select project: qpxzuglvvfvookzmpgfe
3. Settings > API
4. Copy "Project URL" and "anon public" key
```

#### Webhook Secret
```bash
# Generate secure secret
openssl rand -hex 32

# Or use online generator
# https://www.random.org/strings/
```

#### Sentry DSN
```
1. Go to https://sentry.io
2. Create new project or select existing
3. Settings > Client Keys (DSN)
4. Copy DSN URL
```

## Domain Configuration

### Configure Custom Domain

1. **Add Domain in Vercel**
   ```
   1. Project Settings > Domains
   2. Add Domain: easyflow-pro.site
   3. Add www.easyflow-pro.site (redirect)
   ```

2. **Update DNS Records**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21 (Vercel IP)
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

3. **SSL Certificate**
   - Vercel automatically provisions SSL
   - Certificate auto-renews
   - Force HTTPS in settings

### Verify Domain
```bash
# Check DNS propagation
nslookup easyflow-pro.site

# Test HTTPS
curl https://easyflow-pro.site
```

## Post-Deployment

### Verification Checklist

- [ ] **Application loads**: Visit https://easyflow-pro.site
- [ ] **Authentication works**: Test login/signup
- [ ] **Database queries work**: Load dashboard
- [ ] **Webhooks work**: Test order creation
- [ ] **Health check**: Visit /health endpoint
- [ ] **Sentry configured**: Check error tracking
- [ ] **SSL active**: HTTPS working
- [ ] **Performance**: Check page load times

### Configure Monitoring

#### Sentry Setup
```typescript
// Already configured in src/lib/sentry.ts
// Set environment variable:
VITE_SENTRY_DSN=your-sentry-dsn
```

#### Vercel Analytics
```
1. Project Settings > Analytics
2. Enable Web Analytics
3. Enable Speed Insights
```

#### Supabase Monitoring
```
1. Supabase Dashboard > Logs
2. Enable Log Drains
3. Configure alerts
```

### Configure Webhooks

#### Messenger360 Webhook
```
1. Messenger360 Dashboard
2. Settings > Webhooks
3. Add webhook URL:
   https://qpxzuglvvfvookzmpgfe.supabase.co/functions/v1/webhook-orders
4. Add signature header: X-Signature
5. Test webhook
```

## Troubleshooting

### Build Failures

#### Issue: Build fails with missing dependencies
```bash
# Solution: Clear cache and reinstall
vercel --force
npm ci
vercel --prod
```

#### Issue: TypeScript errors
```bash
# Solution: Run type check locally
npm run build
# Fix any errors before pushing
```

### Deployment Issues

#### Issue: Environment variables not working
```
Solution:
1. Verify variables in Vercel dashboard
2. Redeploy to pick up new variables
3. Check variable names match code
```

#### Issue: Supabase connection fails
```
Solution:
1. Verify Supabase URL and keys
2. Check RLS policies are correct
3. Verify user authentication
```

### Runtime Issues

#### Issue: 404 errors on routes
```
Solution:
1. Verify vercel.json has rewrites
2. Add rewrites for SPA routing:
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

#### Issue: Slow performance
```
Solution:
1. Check bundle sizes (npm run build)
2. Enable caching headers
3. Verify CDN is working
4. Check database query performance
```

## Maintenance

### Regular Updates

#### Weekly
- Review deployment logs
- Check error rates in Sentry
- Monitor performance metrics
- Review security alerts

#### Monthly
- Update dependencies
- Review and rotate secrets
- Check SSL certificate
- Performance audit

### Rollback Procedure

If deployment has issues:

```bash
# Method 1: Vercel Dashboard
1. Go to Deployments
2. Find last working deployment
3. Click "Promote to Production"

# Method 2: Git revert
git revert HEAD
git push origin main
# Vercel auto-deploys the revert
```

## Support

### Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev/)

### Contact
- **Email**: ougajs@gmail.com
- **GitHub Issues**: https://github.com/ougajs-sys/easyflows-pro/issues

---

**Last Updated**: January 21, 2026

For questions or concerns, contact: ougajs@gmail.com
