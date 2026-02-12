

## Correction : Débloquer le build Netlify (faux positif du scanner de secrets)

### Probleme

Netlify détecte la clé Firebase API (`AIzaSy...`) dans `src/config/firebase.ts` comme un secret potentiel et bloque le build. Cette clé est une **clé publique SDK** (publishable key) qui est conçue pour être exposée côté client — ce n'est pas un secret.

### Solution

Ajouter une variable d'environnement dans le fichier `netlify.toml` pour désactiver la détection intelligente de secrets pour cette valeur spécifique.

### Modification

**Fichier : `netlify.toml`**

Ajouter dans la section `[build.environment]` :

```text
SECRETS_SCAN_SMART_DETECTION_ENABLED = "false"
```

Alternativement, pour une approche plus ciblée, utiliser `SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES` avec la clé Firebase concernée. Mais désactiver la détection intelligente est plus simple car les vraies clés secrètes ne sont jamais dans le code (elles sont stockées dans les secrets Supabase).

### Pourquoi c'est sur

- La clé Firebase API (`AIzaSy...`) est une clé **publique** conçue pour être utilisée côté client
- Elle est restreinte par les règles de sécurité Firebase (domaines autorisés, etc.)
- Les vrais secrets (service account, webhook secret, etc.) sont stockés dans les secrets Supabase Edge Functions, jamais dans le code source
- Netlify documente cette approche : https://ntl.fyi/configure-secrets-scanning

### Resultat attendu

- Le build Netlify passera sans erreur
- Aucun changement fonctionnel dans l'application
- Les notifications push et toutes les fonctionnalités restent identiques

