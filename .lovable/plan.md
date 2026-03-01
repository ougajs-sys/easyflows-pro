

# Integration sms8.io pour SMS + Messenger360 pour WhatsApp

## Architecture cible

- **SMS** (campagnes + notifications) : sms8.io API (`https://app.sms8.io/services/send.php`)
- **WhatsApp** (campagnes uniquement) : Messenger360 API (inchange)

## Secrets necessaires

Deux nouveaux secrets Supabase a ajouter :
- `SMS8_API_KEY` : cle API sms8.io
- `SMS8_DEVICE_ID` : identifiant appareil Android au format `deviceID|simSlot`

## Modifications

### 1. Edge Function `send-campaign/index.ts`
- Ajouter routage par `campaign.type` :
  - Si `type === 'sms'` : appeler sms8.io (`GET https://app.sms8.io/services/send.php?key=...&number=...&message=...&devices=[...]&type=sms`)
  - Si `type === 'whatsapp'` : garder Messenger360 (inchange)
- Charger `SMS8_API_KEY` et `SMS8_DEVICE_ID` depuis les secrets
- Adapter le delai anti-throttling (sms8.io n'a pas les memes limites que Messenger360)

### 2. Edge Function `send-sms/index.ts`
- Meme routage par `type` :
  - `sms` -> sms8.io
  - `whatsapp` -> Messenger360

### 3. Edge Function `send-notification-sms/index.ts`
- Router par `channel` :
  - `sms` -> sms8.io
  - `whatsapp` -> Messenger360

### 4. Format du numero pour sms8.io
- sms8.io attend le numero au format international avec `+` (ex: `+2250712345678`)
- Adapter `normalizeCIPhone` pour retourner le format `+225...` pour sms8.io

### 5. UI `SmsTestPanel.tsx`
- Mettre a jour la description pour indiquer le double fournisseur (SMS via sms8.io, WhatsApp via Messenger360)

### 6. Deploiement
- Ajouter les 2 secrets via l'outil secrets
- Redeployer les 3 Edge Functions

