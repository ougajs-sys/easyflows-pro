

# Plan : Corriger le blocage de diffusion des campagnes

## Probleme

`process-campaign-queue` selectionne le `campaign_queue_control` le plus ancien (ORDER BY next_batch_at ASC LIMIT 1). L'ancienne campagne terminee `6db2bff2` a toujours une ligne dans cette table, bloquant indefiniment la nouvelle campagne `176e22a5` (2841 messages en attente).

## Corrections

### 1. Edge Function `supabase/functions/process-campaign-queue/index.ts`

**Quand une campagne est terminee (0 messages pending), SUPPRIMER la ligne `campaign_queue_control`** au lieu de la laisser :

```typescript
// Apres: No more messages, mark campaign as completed
await supabase
  .from("campaign_queue_control")
  .delete()
  .eq("id", control.id);  // SUPPRIMER la ligne
```

Meme chose quand `remaining === 0` apres un batch :

```typescript
if (remaining === 0) {
  // Supprimer le control pour liberer la file
  await supabase.from("campaign_queue_control").delete().eq("id", control.id);
  // Mettre a jour la campagne
  await supabase.from("campaigns").update({ ... }).eq("id", control.campaign_id);
}
```

### 2. Migration SQL — Nettoyer les controls orphelins existants

Supprimer immediatement la ligne `campaign_queue_control` de l'ancienne campagne completee pour debloquer la file :

```sql
DELETE FROM campaign_queue_control
WHERE campaign_id IN (
  SELECT id FROM campaigns WHERE status IN ('completed', 'cancelled')
);
```

### 3. Securite supplementaire dans le SELECT

Ajouter un filtre pour ne prendre que les controls dont la campagne n'est PAS deja terminee :

```typescript
const { data: readyControls } = await supabase
  .from("campaign_queue_control")
  .select("*, campaigns!inner(status)")
  .lte("next_batch_at", now)
  .not("campaigns.status", "in", '("completed","cancelled")')
  .order("next_batch_at", { ascending: true })
  .limit(1);
```

## Fichiers modifies

| Fichier | Modification |
|---|---|
| `supabase/functions/process-campaign-queue/index.ts` | Supprimer `campaign_queue_control` quand campagne terminee + filtrer les campagnes deja completees |
| Migration SQL | Nettoyer les controls orphelins existants |

## Resultat attendu

La campagne `176e22a5` (2841 messages WhatsApp) commencera a etre traitee des le prochain cycle cron (1 minute).

