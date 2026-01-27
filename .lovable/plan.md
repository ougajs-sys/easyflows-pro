

# Integration Elementor Webhook - Synchronisation des commandes confirmees

## Objectif
Envoyer automatiquement les donnees de commande vers un webhook Elementor lorsqu'une commande passe au statut "confirmed" (confirmee).

## Architecture

```text
+------------------+     +----------------------+     +-------------------+
|   Frontend       | --> | Edge Function        | --> | Elementor Webhook |
|   (updateStatus) |     | sync-order-elementor |     | (URL externe)     |
+------------------+     +----------------------+     +-------------------+
```

## Etapes d'implementation

### 1. Ajout du secret ELEMENTOR_WEBHOOK_URL
Configuration du secret dans Supabase pour stocker l'URL du webhook Elementor de destination.

### 2. Creation de l'Edge Function `sync-order-elementor`
Nouvelle fonction edge qui:
- Recoit les donnees de commande confirmee
- Formate les donnees selon le schema Elementor
- Envoie vers le webhook configure
- Gere les erreurs et retries

### 3. Modification du hook `useOrders.tsx`
Appel automatique de l'edge function lors du changement de statut vers "confirmed".

## Details techniques

### Edge Function: `sync-order-elementor`

```typescript
// Endpoint: /functions/v1/sync-order-elementor
// Methode: POST
// Authentification: JWT requis

// Payload attendu:
{
  order_id: string,
  order_number: string,
  client_name: string,
  client_phone: string,
  client_address: string,
  client_city: string,
  product_name: string,
  quantity: number,
  unit_price: number,
  total_amount: number,
  status: "confirmed",
  confirmed_at: string
}

// Format envoye vers Elementor:
{
  form_name: "order_confirmation",
  fields: {
    order_number: "CMD-000123",
    client_name: "...",
    client_phone: "...",
    // ... autres champs
  }
}
```

### Modification de `useOrders.tsx`

```typescript
// Dans updateOrderStatus mutation:
if (status === 'confirmed') {
  // Appel non-bloquant vers sync-order-elementor
  supabase.functions.invoke('sync-order-elementor', {
    body: { order_id: id }
  });
}
```

## Fichiers a modifier/creer

| Fichier | Action |
|---------|--------|
| `supabase/functions/sync-order-elementor/index.ts` | Creer |
| `supabase/config.toml` | Modifier (ajouter fonction) |
| `src/hooks/useOrders.tsx` | Modifier (appel sync) |

## Gestion des erreurs
- Log des erreurs dans la console Supabase
- Notification non-bloquante (la confirmation de commande n'echoue pas si Elementor echoue)
- Possibilite de retry manuel depuis le dashboard

## Securite
- JWT requis pour l'appel de l'edge function
- Secret ELEMENTOR_WEBHOOK_URL stocke de maniere securisee
- Validation des donnees avant envoi

