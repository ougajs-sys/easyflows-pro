

## Correction : Supprimer la dépendance au Vault pour les notifications push

### Probleme
La fonction SQL `http_post_with_service_role()` tente de lire un secret (`service_role_key`) depuis le Vault Supabase. Cela echoue car les permissions du Vault sont restrictives dans l'editeur SQL standard.

### Solution
L'Edge Function `send-push-notification` est configuree avec `verify_jwt = false` dans `supabase/config.toml`. Elle n'a donc **pas besoin** d'un Bearer token valide pour etre appelee. On peut simplifier la fonction SQL pour utiliser directement la cle anon (publique et deja connue).

### Ce qui va changer

**1. Migration SQL** - Modifier la fonction `http_post_with_service_role()`

Remplacer la lecture du Vault par la cle anon hardcodee (cle publique, sans risque de securite) :

```text
Avant:
  vault.decrypted_secrets -> service_role_key -> erreur si absent

Apres:
  Cle anon hardcodee directement dans la fonction (cle publique)
```

La cle anon est : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFweHp1Z2x2dmZ2b29rem1wZ2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NzA3NzYsImV4cCI6MjA4MjQ0Njc3Nn0.Km_gUYYcjHSTbkZIu6_QIYT4bCa6SXZc0eXV3FwYhrc`

C'est une cle **publique** (elle est deja visible dans le code client), donc aucun risque de securite.

**2. Aucun changement cote frontend** - Le code React reste identique.

### Resultat attendu
- Les triggers SQL (`orders_push_notify`, `messages_push_notify`) pourront appeler l'Edge Function sans aucune dependance au Vault
- Les commandes continueront a etre creees normalement
- Les notifications push seront envoyees des que des utilisateurs auront enregistre leurs tokens FCM

### Details techniques

La fonction `http_post_with_service_role` sera simplifiee :

```text
CREATE OR REPLACE FUNCTION public.http_post_with_service_role(url text, body jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
declare
  anon_key text := 'eyJhbGci...'; -- cle publique anon
  resp record;
begin
  select * into resp from net.http_post(
    url := url,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := body::text,
    timeout_milliseconds := 10000
  );
  return jsonb_build_object('status', resp.status_code, 'body', resp.response_body);
end;
$$;
```

Cela supprime completement le besoin de configurer quoi que ce soit dans le Vault.

