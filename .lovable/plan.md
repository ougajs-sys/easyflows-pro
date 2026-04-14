

# Plan : Integrer ManyChat comme fournisseur WhatsApp Business API

## Contexte

Les messages envoyes via Messenger360 (numero non verifie) tombent en spam a 99%. ManyChat, en tant que BSP officiel WhatsApp Business API avec un compte verifie, resout ce probleme car les messages arrivent avec le nom d'entreprise verifie (badge vert).

## Contrainte importante de ManyChat

ManyChat fonctionne differemment de Messenger360 :
- Les contacts doivent etre des **subscribers** ManyChat (avec un `subscriber_id`)
- Hors fenetre 24h, seuls les **Message Templates approuves** peuvent etre envoyes (via `/fb/sending/sendFlow`)
- Dans la fenetre 24h, on peut envoyer du texte libre (via `/fb/sending/sendContent`)
- Il faut d'abord **creer le subscriber** via `/fb/subscriber/createSubscriber` avec le numero WhatsApp

## Architecture proposee

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│ EasyFlows Pro   │────>│ Edge Functions    │────>│ ManyChat API│
│ (Campagnes)     │     │ (send-sms, etc.) │     │ (WhatsApp)  │
└─────────────────┘     └──────────────────┘     └─────────────┘
                              │                        │
                              │ 1. createSubscriber     │
                              │ 2. sendFlow (template)  │
                              │    ou sendContent (24h) │
                              └────────────────────────>│
```

## Modifications

### 1. Nouvelle fonction utilitaire : `sendViaManyChat`

Remplacer `sendViaMessenger360` dans les 4 edge functions par une nouvelle fonction `sendViaManyChat` qui :

1. **Cree le subscriber** si inexistant : `POST https://api.manychat.com/fb/subscriber/createSubscriber` avec `{ whatsapp_phone, first_name, consent_phrase }`
2. **Envoie le message** via : `POST https://api.manychat.com/fb/sending/sendContent` avec `{ subscriber_id, data: { version: "v2", content: { type: "whatsapp", messages: [{ type: "text", text }] } } }`
3. En cas d'echec (hors 24h), **fallback sur sendFlow** avec un template pre-approuve

Headers : `Authorization: Bearer MANYCHAT_API_KEY`, `Content-Type: application/json`

### 2. Nouveau secret Supabase

- `MANYCHAT_API_KEY` : Token API ManyChat (genere dans Settings > API)
- `MANYCHAT_FLOW_NS` : Namespace du flow de fallback pour les templates (optionnel au debut)

### 3. Fichiers modifies

| Fichier | Modification |
|---|---|
| `supabase/functions/send-sms/index.ts` | Remplacer `sendViaMessenger360` par `sendViaManyChat` |
| `supabase/functions/send-campaign/index.ts` | Idem |
| `supabase/functions/send-notification-sms/index.ts` | Idem |
| `supabase/functions/process-campaign-queue/index.ts` | Idem |
| `supabase/functions/send-work-notification/index.ts` | Idem |
| `supabase/functions/_shared/manychat.ts` | Nouveau fichier partage avec la logique ManyChat |

### 4. Table de mapping (optionnel mais recommande)

Creer une table `manychat_subscribers` pour cacher les `subscriber_id` ManyChat et eviter de recréer les contacts a chaque envoi :

```sql
CREATE TABLE manychat_subscribers (
  phone TEXT PRIMARY KEY,
  subscriber_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5. Pre-requis cote ManyChat (action manuelle)

Avant l'implementation, vous devez :
1. **Generer un token API** dans ManyChat (Settings > API > Generate Token)
2. **Contacter le support ManyChat** pour activer la permission `createSubscriber` avec `wa_id` (necessaire pour importer des contacts par telephone)
3. **Creer un Message Template** dans ManyChat pour les campagnes marketing (approuve par WhatsApp)
4. **Creer un Flow** dans ManyChat qui envoie ce template (pour l'endpoint `sendFlow`)

## Resultat attendu

- Messages WhatsApp delivres avec le badge verifie (nom d'entreprise)
- Taux d'ouverture passe de ~1% a 70-90%
- SMS via sms8.io reste inchange (pas affecte)
- Compatible avec le systeme anti-spam progressif existant

