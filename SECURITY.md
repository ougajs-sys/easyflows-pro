# 🔒 Security and Monitoring Setup

This document describes the security and monitoring infrastructure implemented for EasyFlows Pro.

## 📋 Overview

The application includes comprehensive security features:

1. **Environment Variable Security** - Secrets management with `.env` files
2. **Webhook Security** - HMAC-SHA256 signature verification
3. **Input Validation** - Zod schemas for type-safe validation
4. **Rate Limiting** - Protection against DDOS and abuse
5. **Row-Level Security (RLS)** - Database-level access control
6. **Error Monitoring** - Sentry integration for production tracking
7. **Secure Deployment** - Netlify configuration with security headers

## 🔐 Security Features

### 1. Environment Variables (`.env.example`)

Template for secure configuration:

```env
VITE_SUPABASE_URL=https://qpxzuglvvfvookzmpgfe.supabase.co
VITE_SUPABASE_PROJECT_ID=qpxzuglvvfvookzmpgfe
VITE_SUPABASE_PUBLISHABLE_KEY=your_key_here
WEBHOOK_SECRET=your-webhook-secret-min-32-chars
MESSENGER360_API_KEY=0XKinPxbcHiUXvDf7QNKBtPfE2zy2bBAqwo
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

**Setup Instructions:**
1. Copy `.env.example` to `.env`
2. Fill in your actual secrets (NEVER commit `.env` to git)
3. For production, set these in Netlify dashboard under Environment Variables

### 2. Webhook Signature Verification

Location: `supabase/functions/webhook-orders/crypto-utils.ts`

**Features:**
- HMAC-SHA256 signature calculation
- Timing-safe comparison to prevent timing attacks
- Support for multiple signature header formats
- Secure random secret generation

**Usage:**
```typescript
import { verifyWebhookSignature, extractSignatureFromHeaders } from "./crypto-utils.ts";

// In webhook handler
const signature = extractSignatureFromHeaders(req.headers);
const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret);
```

**How to generate a webhook secret:**
```bash
# Using openssl
openssl rand -hex 32

# Or in Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Input Validation

Location: `supabase/functions/_shared/validation.ts`

**Features:**
- Zod schemas for orders, clients, campaigns
- Phone number validation
- Email validation
- XSS prevention via string sanitization

**Usage:**
```typescript
import { validateWithZod, CreateOrderSchema, sanitizeString } from "../_shared/validation.ts";

const result = validateWithZod(data, CreateOrderSchema);
if (!result.success) {
  throw new Error(result.errors.join(", "));
}
```

### 4. Rate Limiting

Location: `supabase/functions/_shared/rate-limit.ts`

**Configurations:**
- **Webhooks**: 1000 requests/minute
- **API**: 500 requests/minute
- **Auth**: 20 requests/minute

**Usage:**
```typescript
import { webhookRateLimiter, applyRateLimit } from "../_shared/rate-limit.ts";

// In function handler
const rateLimitResponse = applyRateLimit(req, webhookRateLimiter);
if (rateLimitResponse) {
  return rateLimitResponse; // Returns 429 if rate limit exceeded
}
```

### 5. Row-Level Security (RLS)

Location: `supabase/migrations/20260121110400_fix-rls-policies.sql`

**Policies Implemented:**

#### Clients
- Users can only view their own clients
- Admins/supervisors can view all clients
- User isolation on create

#### Campaigns
- Only supervisors and admins can manage campaigns
- Regular users cannot access campaigns

#### Orders
- Users see only their orders or assigned orders
- Delivery persons see only assigned orders
- Admins/supervisors see all

#### Payments
- Restricted to admins, supervisors, and order creators
- Only admins can delete payments

#### Audit Logging
- New `audit_logs` table for tracking sensitive actions
- Only admins can view audit logs

**Testing RLS:**
```sql
-- Test as a regular user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub = '<user-id>';

-- Try to access data
SELECT * FROM clients;
```

## 📊 Monitoring (Sentry)

Location: `src/lib/sentry.ts`

**Features:**
- Error tracking with context
- Performance monitoring
- Session replay (10% sampling)
- User context tracking
- Breadcrumbs for debugging

**Usage:**
```typescript
import { captureException, setUserContext, addBreadcrumb } from "@/lib/sentry";

// Set user context on login
setUserContext({
  id: user.id,
  email: user.email,
  username: user.full_name
});

// Add breadcrumb for debugging
addBreadcrumb("Order created", "order", "info", { orderId: order.id });

// Capture errors
try {
  // ... code
} catch (error) {
  captureException(error, { context: "order-creation" });
}
```

**Configuration:**
1. Create a Sentry project at https://sentry.io
2. Copy your DSN
3. Add to `.env`: `VITE_SENTRY_DSN=https://xxx@sentry.io/xxx`
4. Sentry initializes automatically in `src/main.tsx`

## 🚀 Netlify Deployment

Location: `netlify.toml`

**Security Headers:**
- `X-Content-Type-Options: nosniff` - Prevent MIME sniffing
- `X-Frame-Options: DENY` - Prevent clickjacking
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Content-Security-Policy` - Restrict resource loading
- `Referrer-Policy` - Control referrer information

**Setup:**
1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy will use `netlify.toml` configuration automatically

## ✅ Security Checklist

Before deploying to production:

- [ ] Set strong `WEBHOOK_SECRET` (minimum 32 characters)
- [ ] Configure Sentry DSN for error monitoring
- [ ] Set all environment variables in Netlify dashboard
- [ ] Verify `.env` is in `.gitignore` (it is)
- [ ] Test webhook signature verification
- [ ] Test rate limiting
- [ ] Verify RLS policies in Supabase dashboard
- [ ] Review Sentry error reports regularly
- [ ] Set up alerts for critical errors in Sentry
- [ ] Enable Supabase database backups
- [ ] Review audit logs periodically

## 🔧 Troubleshooting

### Webhook signature verification fails
1. Verify `WEBHOOK_SECRET` is set correctly
2. Check that the webhook sender is using the same secret
3. Verify the signature header format (`X-Webhook-Signature` or `X-Hub-Signature-256`)

### Rate limit errors (429)
1. Check if legitimate traffic is being blocked
2. Adjust rate limits in `_shared/rate-limit.ts` if needed
3. Implement user-specific rate limiting if needed

### RLS policy blocks legitimate access
1. Review the policy in the migration file
2. Check user roles with `SELECT * FROM user_roles WHERE user_id = auth.uid()`
3. Test with `EXPLAIN` to see which policy is blocking

### Sentry not capturing errors
1. Verify `VITE_SENTRY_DSN` is set
2. Check browser console for Sentry initialization errors
3. Test with `captureException(new Error("Test"))`

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Netlify Security Headers](https://docs.netlify.com/routing/headers/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

## 🤝 Support

For issues or questions:
1. Check this documentation
2. Review error logs in Sentry
3. Check Supabase logs
4. Contact: ougajs@gmail.com
