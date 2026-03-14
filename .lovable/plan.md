

# Diagnostic : Pourquoi le formulaire ne fonctionne pas

## Probleme identifie

Le template HTML custom a **son propre formulaire modal** (`id="orderForm"`) avec ses propres boutons CTA (`openModal('Pack Economique','19 500')`). Quand un client clique "COMMANDER", la modale s'ouvre avec le formulaire du template.

**Mais** ce formulaire ne fait qu'un `console.log` a la soumission (ligne 535 du template) — il n'envoie jamais la commande au webhook.

Pendant ce temps, le formulaire injecte par `buildInjectedFormHtml` est ajoute **en bas de page**, invisible, car personne ne scrolle jusque-la — les utilisateurs interagissent avec la modale du template.

En resume : **deux formulaires coexistent, celui visible ne soumet rien, celui fonctionnel est invisible.**

De plus, la page apparait blanche dans certains cas car le chargement des scripts CDN dans l'iframe peut echouer ou etre retarde.

## Solution

### 1. Injecter un script qui intercepte le formulaire existant du template

Au lieu d'ajouter un formulaire HTML complet en bas de page, injecter un **script d'interception** qui :
- Detecte si un formulaire avec `id="orderForm"` existe deja dans le HTML custom
- Si oui, **remplace** son handler `submit` pour envoyer les donnees au webhook via `fetch`
- Apres succes, notifie le parent via `postMessage` (pour la page de remerciement + Pixel)
- Si non, garde le formulaire injecte actuel comme fallback

### 2. Modifier `buildInjectedFormHtml` pour inclure le script d'interception

Ajouter une section dans le HTML injecte qui contient un script generique capable de :
- Trouver le formulaire existant du template (`#orderForm` ou tout `form` dans une modale)
- Intercepter sa soumission
- Extraire les champs (`full_name`/`client_name`, `phone`, `address`/`delivery_address`, `notes`, quantite)
- Poster au webhook avec le `product_id`, `product_name`, `unit_price` corrects
- Afficher un etat de chargement sur le bouton submit
- En cas de succes : fermer la modale et notifier le parent

### 3. Conserver le formulaire injecte comme fallback

Pour les templates qui n'ont PAS de formulaire integre, le formulaire actuel reste visible en bas de page.

## Fichiers modifies

| Fichier | Changement |
|---------|-----------|
| `src/components/landing/buildInjectedFormHtml.ts` | Ajouter un script d'interception qui hijack le formulaire existant du template + garder le formulaire injecte en fallback (cache si un formulaire existe deja) |
| `src/pages/ProductLanding.tsx` | Aucun changement structurel necessaire — le script est deja injecte via `buildInjectedFormHtml` |

## Detail technique du script d'interception

```javascript
// Injecte dans le srcdoc
(function(){
  var existingForm = document.getElementById('orderForm');
  if (!existingForm) return; // pas de formulaire template, le fallback s'affiche
  
  // Cacher le formulaire injecte puisque le template a le sien
  var injected = document.getElementById('order-form');
  if (injected) injected.style.display = 'none';
  
  // Remplacer le handler submit
  existingForm.addEventListener('submit', function(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    // ... fetch vers webhook + postMessage au parent
  }, true); // capture phase pour etre execute avant le handler original
})();
```

Ce script s'execute **apres** le script original du template, et utilise la phase de capture pour intercepter avant le handler existant. Il extrait les champs du formulaire, envoie au webhook, et notifie le parent pour la page de remerciement.

