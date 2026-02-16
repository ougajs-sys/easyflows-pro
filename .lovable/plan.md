

# Correction du systeme de campagnes SMS/WhatsApp

## Problemes identifies

### Probleme 1 (CRITIQUE) : `auth.getClaims()` n'existe pas
Dans la derniere mise a jour de securite du fichier `supabase/functions/send-sms/index.ts` (ligne 41), la methode `authClient.auth.getClaims(token)` a ete utilisee. **Cette methode n'existe pas** dans le SDK Supabase JS. La methode correcte est `authClient.auth.getUser()`.

Cela provoque un crash immediat de la fonction : chaque appel retourne une erreur 401 ou 500, ce qui explique les 0 envoyes et 1000 echecs sur les campagnes recentes.

Preuve : les campagnes creees **avant** la mise a jour de securite (05/02/2026) montrent des envois reussis (66/119, 66/98). Les campagnes **apres** (15/02, 16/02) montrent 0/1000 avec 1000 echecs.

### Probleme 2 : Limite de 1000 destinataires
La fonction `send-sms` rejette les requetes depassant 1000 numeros (ligne 75-79). Mais le hook `useCampaigns` envoie TOUS les numeros en une seule requete. Avec ~10 000 clients importes, toute campagne ciblant "tous les clients" echouera systematiquement.

### Probleme 3 : `process-scheduled-campaigns` incompatible
La fonction `process-scheduled-campaigns` appelle `send-sms` via `supabase.functions.invoke` avec la cle service role. Mais `send-sms` attend maintenant un JWT utilisateur pour extraire l'ID utilisateur. Cet appel machine-a-machine echouera toujours.

### Probleme 4 : Meme bug dans `send-notification-sms`
Le fichier `supabase/functions/send-notification-sms/index.ts` utilise probablement aussi `getClaims` (ajoute dans la meme mise a jour securite).

## Solution

### Fichier 1 : `supabase/functions/send-sms/index.ts`

- Remplacer `authClient.auth.getClaims(token)` par `authClient.auth.getUser()` (methode standard)
- Extraire `userId` depuis `userData.user.id`
- Augmenter la limite de 1000 a 10000 destinataires (la boucle d'envoi gere deja le traitement un par un)
- Ajouter un mode "service" : si le header Authorization contient la cle service role, bypasser le check de role utilisateur (pour permettre a `process-scheduled-campaigns` d'appeler `send-sms`)

### Fichier 2 : `src/hooks/useCampaigns.tsx`

- Ajouter un systeme de **batching** cote client : decouper les numeros en lots de 500 et les envoyer sequentiellement
- Cumuler les resultats (sent/failed) de chaque lot
- Mettre a jour la campagne avec les totaux finaux

### Fichier 3 : `supabase/functions/send-notification-sms/index.ts`

- Appliquer la meme correction : remplacer `getClaims` par `getUser()`

### Fichier 4 : `supabase/functions/process-scheduled-campaigns/index.ts`

- S'assurer que l'appel a `send-sms` passe le header Authorization avec la cle service role pour beneficier du mode service

## Details techniques

### Correction auth (send-sms)

Avant (ligne 41, CASSEE) :
```text
const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
const userId = claimsData.claims.sub;
```

Apres (CORRIGEE) :
```text
const { data: userData, error: userError } = await authClient.auth.getUser();
const userId = userData?.user?.id;
```

### Batching cote client (useCampaigns)

```text
const BATCH_SIZE = 500;
for (let i = 0; i < phones.length; i += BATCH_SIZE) {
  const batch = phones.slice(i, i + BATCH_SIZE);
  const result = await supabase.functions.invoke("send-sms", {
    body: { campaign_id, phones: batch, message, type }
  });
  totalSent += result.data.sent;
  totalFailed += result.data.failed;
}
```

### Mode service pour appels internes

La fonction detectera si l'appel vient d'une autre edge function (via la cle service role) et sautera la verification de role utilisateur, tout en gardant la validation des donnees d'entree.

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/send-sms/index.ts` | Fix `getClaims` -> `getUser()`, augmenter limite, mode service |
| `supabase/functions/send-notification-sms/index.ts` | Fix `getClaims` -> `getUser()` |
| `src/hooks/useCampaigns.tsx` | Batching par lots de 500 |
| `supabase/functions/process-scheduled-campaigns/index.ts` | Pas de changement necessaire (utilise deja service role) |

## Aucune migration SQL necessaire

