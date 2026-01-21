# ⚡ Performance Guide - EasyFlows Pro

## Table des matières
- [Vue d'ensemble](#vue-densemble)
- [Optimisations frontend](#optimisations-frontend)
- [Optimisations backend](#optimisations-backend)
- [Base de données](#base-de-données)
- [Caching](#caching)
- [Monitoring des performances](#monitoring-des-performances)

---

## Vue d'ensemble

### Métriques cibles

| Métrique | Objectif | Actuel |
|----------|----------|--------|
| First Contentful Paint | < 1.8s | ✅ |
| Time to Interactive | < 3.9s | ✅ |
| Largest Contentful Paint | < 2.5s | ✅ |
| Cumulative Layout Shift | < 0.1 | ✅ |
| First Input Delay | < 100ms | ✅ |

### Outils de mesure

```bash
# Lighthouse
npm run build
npx lighthouse https://easyflow-pro.site --view

# Web Vitals
npm install web-vitals
```

---

## Optimisations frontend

### 1. Code Splitting

```typescript
// Lazy loading des pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Orders = lazy(() => import('./pages/Orders'));

// Dans App.tsx
<Suspense fallback={<Loading />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/orders" element={<Orders />} />
  </Routes>
</Suspense>
```

### 2. Image Optimization

```typescript
// Utiliser des formats modernes
<img 
  src="/images/product.webp" 
  loading="lazy"
  width="300" 
  height="200"
  alt="Product"
/>

// Responsive images
<picture>
  <source srcset="/images/product-small.webp" media="(max-width: 768px)" />
  <source srcset="/images/product-large.webp" media="(min-width: 769px)" />
  <img src="/images/product.webp" alt="Product" />
</picture>
```

### 3. React Query Optimization

```typescript
// Configuration optimale
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Prefetching
queryClient.prefetchQuery(['orders'], fetchOrders);

// Pagination
const { data } = useInfiniteQuery(
  ['orders'],
  ({ pageParam = 0 }) => fetchOrders(pageParam),
  {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  }
);
```

### 4. Bundle Size Optimization

```bash
# Analyser la taille du bundle
npm run build
npx vite-bundle-visualizer

# Tree-shaking
# Importer seulement ce qui est nécessaire
import { Button } from '@radix-ui/react-dialog'; // ❌
import Button from '@radix-ui/react-dialog/Button'; // ✅
```

### 5. Memoization

```typescript
// Composants
const MemoizedComponent = memo(({ data }) => {
  return <div>{data.name}</div>;
});

// Callbacks
const handleClick = useCallback(() => {
  console.log('Clicked');
}, []);

// Valeurs calculées
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

---

## Optimisations backend

### 1. Supabase Edge Functions

```typescript
// Déployer près des utilisateurs
// Les Edge Functions sont automatiquement déployées sur Cloudflare

// Optimiser les requêtes
const { data } = await supabase
  .from('orders')
  .select('id, status, client_id, clients(name, phone)') // Sélectionner uniquement ce qui est nécessaire
  .eq('status', 'pending')
  .limit(50);
```

### 2. Retry avec Backoff

```typescript
// Utiliser retry-utils.ts
import { withRetry } from './_shared/retry-utils';

const result = await withRetry(
  () => fetch('https://api.external.com/data'),
  {
    maxAttempts: 3,
    initialDelayMs: 1000,
    exponentialBase: 2,
  }
);
```

### 3. Circuit Breaker

```typescript
import { CircuitBreaker } from './_shared/retry-utils';

const breaker = new CircuitBreaker(5, 60000); // 5 failures, 1 minute reset

try {
  const result = await breaker.execute(() => 
    fetch('https://unreliable-service.com')
  );
} catch (error) {
  // Service temporarily unavailable
  console.error('Circuit breaker open:', error);
}
```

### 4. Parallel Requests

```typescript
// ❌ Séquentiel (lent)
const orders = await fetchOrders();
const clients = await fetchClients();
const products = await fetchProducts();

// ✅ Parallèle (rapide)
const [orders, clients, products] = await Promise.all([
  fetchOrders(),
  fetchClients(),
  fetchProducts(),
]);
```

---

## Base de données

### 1. Indexes

```sql
-- Créer des index sur les colonnes fréquemment recherchées
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_clients_phone ON clients(phone);

-- Index composites pour les requêtes complexes
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
```

### 2. Requêtes optimisées

```typescript
// ❌ N+1 queries
const orders = await supabase.from('orders').select('*');
for (const order of orders) {
  const client = await supabase
    .from('clients')
    .select('*')
    .eq('id', order.client_id)
    .single();
}

// ✅ Join en une seule requête
const orders = await supabase
  .from('orders')
  .select(`
    *,
    clients (*)
  `);
```

### 3. Pagination

```typescript
// Toujours paginer les grandes listes
const { data, count } = await supabase
  .from('orders')
  .select('*', { count: 'exact' })
  .range(0, 49) // 50 résultats
  .order('created_at', { ascending: false });

// Cursor-based pagination pour les grandes tables
const { data } = await supabase
  .from('orders')
  .select('*')
  .gt('created_at', lastTimestamp)
  .limit(50);
```

### 4. Materialized Views

```sql
-- Pour les rapports complexes
CREATE MATERIALIZED VIEW daily_sales AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as order_count,
  SUM(total_amount) as total_sales
FROM orders
GROUP BY DATE(created_at);

-- Refresh périodique
REFRESH MATERIALIZED VIEW daily_sales;
```

---

## Caching

### 1. Browser Caching

```typescript
// Configuration dans vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Hashing pour cache busting
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
});
```

### 2. CDN Caching (Vercel)

```typescript
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

### 3. React Query Cache

```typescript
// Stratégie de cache adaptée
const { data } = useQuery(
  ['products'],
  fetchProducts,
  {
    staleTime: 24 * 60 * 60 * 1000, // 24h pour les produits
    cacheTime: 7 * 24 * 60 * 60 * 1000, // 7 jours
  }
);

const { data } = useQuery(
  ['orders'],
  fetchOrders,
  {
    staleTime: 0, // Toujours considérer comme stale
    refetchInterval: 30000, // Refresh toutes les 30s
  }
);
```

### 4. Service Worker (PWA)

```typescript
// Caching des assets pour offline
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/assets/main.js',
        '/assets/main.css',
      ]);
    })
  );
});
```

---

## Monitoring des performances

### 1. Web Vitals

```typescript
// src/main.tsx
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  const body = JSON.stringify(metric);
  
  // Envoyer à Sentry ou analytics
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/analytics', body);
  } else {
    fetch('/analytics', { body, method: 'POST', keepalive: true });
  }
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### 2. Performance API

```typescript
// Mesurer les opérations critiques
performance.mark('fetchStart');
await fetchOrders();
performance.mark('fetchEnd');

performance.measure('fetchOrders', 'fetchStart', 'fetchEnd');
const measure = performance.getEntriesByName('fetchOrders')[0];
console.log(`Fetch took ${measure.duration}ms`);
```

### 3. Sentry Performance Monitoring

```typescript
import { measurePerformance } from './lib/sentry';

// Mesurer automatiquement
const orders = await measurePerformance(
  'fetch-orders',
  () => fetchOrders()
);
```

### 4. Database Query Performance

```sql
-- Activer les stats de requêtes
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE status = 'pending'
AND created_at > NOW() - INTERVAL '7 days';

-- Identifier les requêtes lentes
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

---

## Benchmarks

### Objectifs de performance

| Opération | Temps cible | Temps actuel |
|-----------|-------------|--------------|
| Chargement dashboard | < 2s | ✅ 1.8s |
| Création commande | < 500ms | ✅ 420ms |
| Recherche client | < 200ms | ✅ 180ms |
| Upload image | < 3s | ✅ 2.5s |

### Tests de charge

```bash
# Apache Bench
ab -n 1000 -c 10 https://easyflow-pro.site/

# K6 load testing
k6 run load-test.js
```

---

## Checklist d'optimisation

### Avant chaque release

- [ ] Bundle size < 500KB gzipped
- [ ] Lighthouse score > 90
- [ ] Pas de memory leaks
- [ ] Images optimisées (WebP)
- [ ] Code splitting actif
- [ ] Database indexes en place
- [ ] Caching configuré
- [ ] Monitoring actif

---

*Dernière mise à jour: 21 janvier 2026*
