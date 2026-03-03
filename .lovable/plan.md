

# Analyse : Page de destination cassee en production

## Cause racine identifiee

Le probleme vient du **Content-Security-Policy (CSP)** dans `netlify.toml` (ligne 53).

Le HTML custom stocke en base charge **Tailwind CSS** et **Lucide Icons** depuis des CDN externes :
```html
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide@latest"></script>
```

Le CSP de production autorise `unpkg.com` mais **bloque `cdn.tailwindcss.com`** :
```
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://esm.sh https://unpkg.com ...
```

**Resultat** : Tailwind ne se charge pas, toutes les classes CSS sont ignorees, la page est un texte brut sans style.

**Pourquoi ca marche dans l'editeur** : L'apercu Lovable (preview) n'a pas ces headers CSP restrictifs, donc le CDN Tailwind se charge normalement.

## Correction

### 1. Ajouter une regle CSP permissive pour les landing pages `/p/*`

Dans `netlify.toml`, ajouter un bloc `[[headers]]` specifique aux pages de destination **avant** la regle globale `/*`. Cette regle autorisera les scripts, styles et polices externes necessaires aux pages HTML custom :

```toml
[[headers]]
  for = "/p/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://unpkg.com https://esm.sh https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; img-src * data: blob:; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; media-src * data: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'self';"
```

Cela autorise :
- `cdn.tailwindcss.com` (Tailwind CSS)
- `unpkg.com` (Lucide icons)  
- `cdnjs.cloudflare.com` (Font Awesome, autres librairies)
- Images et medias depuis n'importe quelle source (necessaire pour les landing pages)

### 2. Ameliorer le redimensionnement de l'iframe

Dans `ProductLanding.tsx`, le `onLoad` actuel essaie de lire la hauteur une seule fois au chargement. Mais les scripts CDN (Tailwind) modifient le layout apres le chargement initial. Il faut utiliser un `ResizeObserver` ou un intervalle pour recalculer la hauteur apres que les scripts externes aient fini de s'executer.

### 3. Ajouter un `<meta name="viewport">` dans l'injection si absent

Le HTML custom a deja le viewport, mais l'injection `buildInjectedFormHtml.ts` ne verifie pas. Pour la robustesse, s'assurer que le viewport meta est present.

## Fichiers modifies

| Fichier | Changement |
|---------|-----------|
| `netlify.toml` | Ajouter bloc `[[headers]]` pour `/p/*` avec CSP permissive |
| `src/pages/ProductLanding.tsx` | Ameliorer le redimensionnement iframe (ResizeObserver + retry) |

## Impact

- Fix immediat pour toutes les landing pages utilisant du HTML custom avec CDN externes
- L'editeur et la page publiee afficheront le meme resultat
- Aucun impact sur la securite des autres pages (la regle ne s'applique qu'a `/p/*`)

