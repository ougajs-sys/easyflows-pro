

# Corrections de l'Edge Function send-work-notification

## Problemes identifies (3 bugs critiques)

1. **Mauvaise URL API** : `https://messenger360/api/send` au lieu de `https://api.360messenger.com/v2/sendMessage`
2. **Mauvais format de requete** : JSON avec `to`/`message` au lieu de `application/x-www-form-urlencoded` avec `phonenumber`/`text`/`channel`
3. **Mauvais header d'auth** : `x-api-key` au lieu de `Authorization: Bearer`
4. **Normalisation incomplete** : ne gere que les numeros commencant par `07` et les 8 chiffres, alors que CI a aussi `01`, `05`, `21-25`, `27`

Le secret `MESSENGER360_API_KEY` est bien configure -- pas de probleme la-dessus.

## Corrections a appliquer

### Edge Function `send-work-notification/index.ts`

- Aligner l'appel Messenger360 sur le pattern exact de `send-sms/index.ts` :
  - URL : `https://api.360messenger.com/v2/sendMessage`
  - Headers : `Authorization: Bearer <key>`, `Content-Type: application/x-www-form-urlencoded`
  - Body : `URLSearchParams({ phonenumber, text, channel: "whatsapp" })`
- Corriger `normalizeCIPhone` pour accepter tous les prefixes CI valides (`01`, `05`, `07`, `21`, `22`, `23`, `24`, `25`, `27`) et les numeros a 10 chiffres commencant par `0X`
- Ajouter les headers CORS
- Ajouter des logs plus detailles pour le debug
- Ajouter retry sur erreur 429 (rate limit) comme dans `send-sms`

### Fichier unique a modifier
- `supabase/functions/send-work-notification/index.ts`

