

# Configuration Messenger360 - Plan d'implémentation

## Ce que j'ai trouvé

La clé API `MESSENGER360_API_KEY` est déjà enregistrée dans les secrets Supabase. 

Le problème : **l'URL et le format de l'API sont incorrects** dans le code actuel.

## Ce que je vais corriger

### Fichier 1 : `supabase/functions/send-sms/index.ts`

| Avant (incorrect) | Après (correct) |
|-------------------|-----------------|
| URL : `api.messenger360.com/v1/messages` | URL : `api.360messenger.com/v2/sendMessage` |
| Body : `{ to, message, channel }` | Body : `{ phonenumber, text }` |
| Numéro : `+212612345678` | Numéro : `212612345678` (sans le +) |

### Fichier 2 : `supabase/functions/send-notification-sms/index.ts`

Mêmes corrections que ci-dessus.

## Résumé des changements

1. **Nouvelle URL API** : `https://api.360messenger.com/v2/sendMessage`
2. **Nouveau format body** : 
   - `phonenumber` au lieu de `to`
   - `text` au lieu de `message`
3. **Nettoyage numéro** : Retirer le `+` du numéro
4. **Header** : Garder `Authorization: Bearer {API_KEY}`

## Après l'implémentation

Tu pourras tester depuis :
- **Campagnes → Test SMS/WhatsApp** (panneau existant)
- Entrer ton numéro et envoyer un message WhatsApp

## Section technique

### Nouvelle fonction de nettoyage du numéro

```typescript
// Nettoyer le numéro pour 360Messenger (sans le +)
const cleanPhone = phone
  .replace(/\s+/g, "")      // Retirer espaces
  .replace(/-/g, "")        // Retirer tirets
  .replace(/^\+/, "")       // Retirer le + au début
  .replace(/^0/, "212");    // Remplacer 0 par 212 (Maroc)
```

### Nouvel appel API

```typescript
const response = await fetch("https://api.360messenger.com/v2/sendMessage", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${MESSENGER360_API_KEY}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({
    phonenumber: cleanPhone,
    text: message,
  }),
});
```

