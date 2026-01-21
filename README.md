# 🚀 EasyFlows Pro - Secure Order Management System

[![Security](https://img.shields.io/badge/Security-A+-green.svg)](./SECURITY.md)
[![Deployment](https://img.shields.io/badge/Deployment-Vercel-black.svg)](./DEPLOYMENT.md)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

EasyFlows Pro est un système de gestion de commandes complet et sécurisé, optimisé pour le e-commerce avec intégration Elementor, WooCommerce et autres plateformes.

## 🔒 Sécurité

Ce projet implémente des mesures de sécurité de niveau enterprise:

- ✅ **Webhook Signature Verification** - HMAC-SHA256
- ✅ **Rate Limiting** - Protection DDOS
- ✅ **Row Level Security (RLS)** - Isolation des données
- ✅ **Input Validation** - Zod schemas
- ✅ **Audit Logging** - Traçabilité complète
- ✅ **Error Monitoring** - Sentry integration
- ✅ **Environment Variables** - Secrets protégés

📖 [Guide de sécurité complet](./SECURITY.md)

## 📚 Documentation

- 🔒 [**SECURITY.md**](./SECURITY.md) - Guide de sécurité complet
- ⚡ [**PERFORMANCE.md**](./PERFORMANCE.md) - Optimisations et benchmarks
- 🚀 [**DEPLOYMENT.md**](./DEPLOYMENT.md) - Guide de déploiement
- 🔧 [**MAINTENANCE.md**](./MAINTENANCE.md) - Maintenance et alertes

## 🚀 Quick Start

### Prérequis

- Node.js 18+
- Git
- Compte Supabase
- Compte Vercel (optionnel)

### Installation

```sh
# Clone le repository
git clone https://github.com/ougajs-sys/easyflows-pro.git
cd easyflows-pro

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your values

# Start development server
npm run dev
```

### Configuration

1. **Supabase**
   - Créer un projet sur [supabase.com](https://supabase.com)
   - Copier les credentials dans `.env`
   - Appliquer les migrations: `supabase db push`

2. **Webhook Security**
   ```bash
   # Générer un secret webhook
   openssl rand -hex 32
   
   # Ajouter dans .env
   WEBHOOK_SECRET=your-generated-secret
   ```

3. **Sentry** (optionnel)
   - Créer un projet sur [sentry.io](https://sentry.io)
   - Copier le DSN dans `.env`

## 📦 Project Structure

```
easyflows-pro/
├── src/
│   ├── components/      # React components
│   ├── pages/          # Application pages
│   ├── lib/            # Libraries (Sentry, etc.)
│   ├── config/         # Configuration (logging, etc.)
│   └── hooks/          # Custom React hooks
├── supabase/
│   ├── functions/      # Edge Functions
│   │   ├── webhook-orders/     # Order webhook
│   │   ├── health/             # Health check
│   │   ├── _shared/            # Shared utilities
│   │   └── ...
│   └── migrations/     # Database migrations
├── SECURITY.md         # Security documentation
├── DEPLOYMENT.md       # Deployment guide
├── PERFORMANCE.md      # Performance guide
└── MAINTENANCE.md      # Maintenance guide
```

## 🔧 Technologies

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **React Query** - Data fetching
- **React Router** - Routing

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Edge Functions (Deno)
  - Real-time subscriptions
  - Row Level Security
- **Sentry** - Error monitoring
- **Zod** - Schema validation

### Deployment
- **Vercel** - Frontend hosting
- **Supabase** - Backend hosting
- **GitHub Actions** - CI/CD (optionnel)

## 🔐 Environment Variables

See [.env.example](./.env.example) for a complete list of required environment variables.

**Critical variables:**
```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Webhook Security
WEBHOOK_SECRET=your-secure-secret-min-32-chars

# Sentry (optional)
VITE_SENTRY_DSN=your-sentry-dsn
```

## 🧪 Testing

```bash
# Run linter
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📊 Performance

- ✅ Lighthouse Score: 90+
- ✅ First Contentful Paint: < 1.8s
- ✅ Time to Interactive: < 3.9s
- ✅ Cumulative Layout Shift: < 0.1

📖 [Guide de performance](./PERFORMANCE.md)

## 🔄 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to production
vercel --prod
```

Or simply push to `main` branch for automatic deployment.

📖 [Guide de déploiement complet](./DEPLOYMENT.md)

## 🛡️ Security

### Reporting Vulnerabilities

If you discover a security vulnerability, please email: **ougajs@gmail.com**

Do NOT create a public GitHub issue.

📖 [Security Policy](./SECURITY.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Contact

**Project Maintainer:** ougajs-sys  
**Email:** ougajs@gmail.com  
**Domain:** [easyflow-pro.site](https://easyflow-pro.site)

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) - Backend infrastructure
- [Vercel](https://vercel.com) - Deployment platform
- [Sentry](https://sentry.io) - Error monitoring
- [shadcn/ui](https://ui.shadcn.com) - UI components

---

Made with ❤️ for secure e-commerce
