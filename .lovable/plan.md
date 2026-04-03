

# Plan : Corriger le lien de domaine et supprimer le blocage d'authentification

## Problemes identifies

1. **Lien landing page** : Le code utilise `window.location.origin` pour generer les liens. En preview, cela donne `id-preview--xxx.lovable.app` au lieu du domaine de production `https://easyflow-pro.site`. Les liens copies et affiches ne pointent donc pas vers le bon domaine.

2. **Ecran d'authentification Lovable** : Les URLs de preview (`id-preview--*.lovable.app`) necessitent un compte Lovable pour y acceder. Si vous partagez ces liens a vos clients, ils voient un ecran de connexion Lovable. La solution : les liens doivent pointer vers le domaine publie (`easyflow-pro.site`).

## Corrections

### Fichiers modifies

| Fichier | Modification |
|---|---|
| `src/components/landing/LandingPageCard.tsx` | Remplacer `window.location.origin` par `https://easyflow-pro.site` |
| `src/components/landing/LandingPageEditor.tsx` | Idem — lien copie et affiche utilise le domaine de production |

### Detail technique

Creer une constante partagee pour le domaine de production :

```typescript
const PRODUCTION_DOMAIN = "https://easyflow-pro.site";
const landingUrl = `${PRODUCTION_DOMAIN}/p/${product.slug}`;
```

Cela garantit que :
- Les liens copies par l'admin pointent directement vers le site public
- Les clients n'ont jamais a passer par un ecran d'authentification Lovable
- Le lien affiche montre clairement le domaine de votre marque

> **Note** : Votre site est deja publie en mode public. Le probleme vient uniquement du fait que les liens generes utilisaient l'URL de preview au lieu du domaine de production.

