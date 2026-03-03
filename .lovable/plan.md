
# Fix: Formulaire de commande sur les landing pages publiées

## Problèmes identifiés

### 1. Réponse webhook mal parsée
Le formulaire (`LandingOrderForm.tsx` ligne 92) lit `result.order_id || result.id` mais le webhook retourne `{ order: { id, order_number } }`. Résultat : `orderId` est `undefined`, donc `crypto.randomUUID()` est utilisé — la commande est bien créée mais la référence affichée est fausse.

**Fix** : Lire `result.order?.id || result.order_id || result.id`

### 2. Formulaire invisible quand HTML custom est utilisé
Quand `landing_html` existe, l'iframe occupe toute la page. Le formulaire React est rendu **en dessous** de l'iframe, mais :
- L'iframe prend `minHeight: 100vh` donc le formulaire n'est pas visible sans scroller
- Les boutons CTA dans le HTML custom (ex: "COMMANDER MAINTENANT") ne peuvent pas cibler `#order-form` dans le parent

**Fix** : Injecter le formulaire de commande directement **dans** le `srcdoc` de l'iframe via `postMessage`. Concrètement :
- Ajouter un script au bas du HTML custom qui écoute un message `postMessage` du parent pour recevoir les données produit
- Le parent envoie `productId`, `productName`, `price`, `brandColor`, `pixelId` au chargement
- Un formulaire HTML natif est injecté en bas du srcdoc
- À la soumission, le formulaire envoie la commande via `fetch` au webhook et communique le succès au parent via `postMessage`
- Le parent intercepte le message de succès et affiche la page de remerciement avec le Pixel Facebook

### 3. Page de remerciement avec Pixel
Déjà fonctionnelle (`LandingThankYou.tsx` + `FacebookPixel.tsx`). Le fix du parsing webhook (point 1) garantira que l'`orderId` correct est utilisé pour le tracking `Purchase`.

## Fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| `src/pages/ProductLanding.tsx` | Injecter un formulaire HTML dans le `srcdoc` + écouter `postMessage` pour le succès de commande |
| `src/components/landing/LandingOrderForm.tsx` | Fix du parsing : `result.order?.id` |
| `src/components/landing/LandingPageEditor.tsx` | Injecter un aperçu de formulaire dans le `previewHtml` quand HTML custom est présent |

## Approche technique pour l'injection du formulaire

Au lieu de rendre le formulaire React en dehors de l'iframe (inaccessible), on :

1. **Ajoute un `<div id="order-form">` + formulaire HTML** à la fin du `srcdoc` avant `</body>` ou après tout le contenu
2. Le formulaire utilise un style cohérent avec `brandColor`
3. À la soumission, un `fetch` vers `webhook-orders` est fait depuis l'iframe
4. En cas de succès, `window.parent.postMessage({ type: 'order-success', orderId, total })` est envoyé
5. Le parent (`ProductLanding.tsx`) écoute ce message et bascule vers `LandingThankYou` avec le Pixel

Cela garantit que les ancres `#order-form` dans le HTML custom fonctionnent, et que le formulaire est visuellement intégré à la landing page.
