

# Plan : Supprimer le formulaire injecte quand le HTML custom contient deja un formulaire

## Probleme

Quand un code HTML est colle dans l'editeur, il contient deja son propre formulaire de commande. Le systeme injecte quand meme un second formulaire (bouton CTA flottant + modal popup), creant un conflit visuel avec deux formulaires superposes. Le script hijack (lignes 315-317) tente de masquer le CTA injecte apres coup, mais le HTML est deja dans le DOM — c'est fragile et cause des flashs visuels.

## Solution

Ajouter un parametre `skipForm` a `buildInjectedFormHtml`. Quand le HTML custom contient deja un `<form`, on passe `skipForm: true` et on n'injecte que le script hijack (pas de CTA, pas de modal).

## Modifications

### 1. `src/components/landing/buildInjectedFormHtml.ts`

- Ajouter `skipForm?: boolean` aux options de la fonction
- Si `skipForm === true` : retourner **uniquement** le script hijack (lignes 299-382) — sans le CSS, le bouton CTA, ni la modal (lignes 18-297)
- Si `skipForm === false` ou absent : comportement actuel inchange

### 2. `src/pages/ProductLanding.tsx`

Dans `LandingWithCustomHtml` (ligne 194), avant d'appeler `buildInjectedFormHtml` :

```typescript
const hasExistingForm = /<form[\s>]/i.test(product.landing_html || "");

const injectedForm = buildInjectedFormHtml({
  productId: product.id,
  productName: product.name,
  price: Number(product.price),
  brandColor,
  webhookUrl,
  skipForm: hasExistingForm,
});
```

## Fichiers modifies

| Fichier | Modification |
|---|---|
| `src/components/landing/buildInjectedFormHtml.ts` | Ajouter param `skipForm`, conditionner l'output |
| `src/pages/ProductLanding.tsx` | Detecter `<form` dans le HTML, passer `skipForm: true` |

