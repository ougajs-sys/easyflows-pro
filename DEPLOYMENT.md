# 🚀 Deployment Checklist for EasyFlows Pro

## Pre-Deployment Security Setup

### 1. Environment Variables Configuration

Set the following environment variables in Netlify dashboard (Site settings → Environment variables):

#### Required Variables:
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://qpxzuglvvfvookzmpgfe.supabase.co
VITE_SUPABASE_PROJECT_ID=qpxzuglvvfvookzmpgfe
VITE_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>

# Webhook Security (CRITICAL)
WEBHOOK_SECRET=<generate-32-char-random-string>

# Messenger360 Integration
MESSENGER360_API_KEY=0XKinPxbcHiUXvDf7QNKBtPfE2zy2bBAqwo

# Sentry Monitoring
VITE_SENTRY_DSN=<your-sentry-dsn>
```

#### Generate Webhook Secret:
```bash
# Option 1: Using openssl
openssl rand -hex 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Sentry Setup

1. Create account at https://sentry.io
2. Create a new project for "React"
3. Copy your DSN from Project Settings → Client Keys
4. Add DSN to Netlify environment variables

### 3. Netlify Configuration

The `netlify.toml` file is already configured with:
- ✅ Build settings
- ✅ Security headers (CSP, X-Frame-Options, etc.)
- ✅ SPA redirect rules
- ✅ Static asset caching

**No additional Netlify configuration needed!**

### 4. Supabase Database Migration

Run the RLS policies migration in your Supabase dashboard:

1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/20260121110400_fix-rls-policies.sql`
3. Execute the migration
4. Verify policies are active in Database → Policies

### 5. Webhook Configuration

#### For External Webhook Providers (e.g., Elementor Forms):

1. **Webhook URL**: 
   ```
   https://qpxzuglvvfvookzmpgfe.supabase.co/functions/v1/webhook-orders
   ```

2. **Required Headers**:
   ```
   Content-Type: application/json
   X-Webhook-Signature: <hmac-sha256-signature>
   ```

3. **Signature Generation** (if webhook provider supports it):
   ```javascript
   const crypto = require('crypto');
   const signature = crypto
     .createHmac('sha256', WEBHOOK_SECRET)
     .update(requestBody)
     .digest('hex');
   ```

4. **Note**: If your webhook provider doesn't support signatures, the endpoint will still work but log a warning.

## Deployment Steps

### Step 1: Connect Repository to Netlify

1. Log in to Netlify
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub account
4. Select the `ougajs-sys/easyflows-pro` repository
5. Select the branch you want to deploy

### Step 2: Configure Build Settings

Netlify will auto-detect settings from `netlify.toml`, but verify:
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Base directory**: (leave empty)

### Step 3: Set Environment Variables

In Netlify dashboard:
1. Go to Site settings → Environment variables
2. Add all variables from Section 1 above
3. Make sure to use the "Production" context

### Step 4: Deploy!

1. Click "Deploy site"
2. Wait for build to complete (~2-3 minutes)
3. Verify no build errors

### Step 5: Configure Custom Domain

1. Go to Site settings → Domain management
2. Add custom domain: `easyflow-pro.site`
3. Follow DNS configuration instructions
4. Wait for SSL certificate to provision (~30 minutes)

## Post-Deployment Verification

### Security Checklist:

- [ ] Environment variables are set correctly in Netlify
- [ ] Sentry is capturing errors (test with a deliberate error)
- [ ] Webhook endpoint is accessible at Supabase URL
- [ ] HMAC signature verification is working (if applicable)
- [ ] Rate limiting is active (check rate limit headers)
- [ ] RLS policies are active in Supabase
- [ ] Security headers are present (check with browser DevTools)
- [ ] SSL certificate is active for custom domain

### Test Webhook Endpoint:

```bash
# Test without signature (should warn but accept)
curl -X POST \
  https://qpxzuglvvfvookzmpgfe.supabase.co/functions/v1/webhook-orders \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+212612345678",
    "client_name": "Test Client",
    "product_name": "Test Product",
    "quantity": 1,
    "unit_price": 100
  }'

# Expected response:
# {"success": true, "message": "Order created successfully", ...}
```

### Monitor in Sentry:

1. Go to Sentry dashboard
2. Check Issues → Errors for any problems
3. Check Performance for slow operations
4. Set up alerts for critical errors

### Check Security Headers:

Open browser DevTools (F12) → Network tab → Click any request → Headers:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'...
```

## Ongoing Maintenance

### Regular Tasks:

1. **Weekly**: Review Sentry error reports
2. **Weekly**: Check Supabase audit logs for suspicious activity
3. **Monthly**: Review rate limiting stats
4. **Monthly**: Rotate webhook secret if compromised
5. **Quarterly**: Review and update dependencies

### Security Monitoring:

- Set up Sentry alerts for high-severity errors
- Monitor failed login attempts in Supabase
- Review unusual rate limit hits
- Check audit logs for unauthorized access attempts

## Troubleshooting

### Build Fails:
1. Check Netlify build logs
2. Verify all dependencies in package.json
3. Ensure environment variables are set

### Webhooks Not Working:
1. Check Supabase function logs
2. Verify webhook URL is correct
3. Check if rate limit is being hit
4. Verify request format matches expected schema

### Authentication Issues:
1. Verify RLS policies in Supabase
2. Check user roles in `user_roles` table
3. Review auth logs in Supabase dashboard

### Rate Limit Errors:
1. Check if legitimate traffic is being blocked
2. Adjust rate limits in `_shared/rate-limit.ts`
3. Consider IP-based allowlisting for trusted sources

## Support & Documentation

- **Security Documentation**: See `SECURITY.md`
- **API Documentation**: Supabase Dashboard → API
- **Issue Reporting**: GitHub Issues
- **Emergency Contact**: ougajs@gmail.com

---

## Quick Reference

### Important URLs:
- **Production Site**: https://easyflow-pro.site
- **Netlify Dashboard**: https://app.netlify.com
- **Supabase Dashboard**: https://app.supabase.com
- **Sentry Dashboard**: https://sentry.io
- **GitHub Repository**: https://github.com/ougajs-sys/easyflows-pro

### Important Files:
- Security Config: `SECURITY.md`
- Webhook Handler: `supabase/functions/webhook-orders/index.ts`
- RLS Policies: `supabase/migrations/20260121110400_fix-rls-policies.sql`
- Netlify Config: `netlify.toml`
- Environment Template: `.env.example`

---

✅ **Ready for Production Deployment!**
