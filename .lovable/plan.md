

# Probleme : le HTML colle ne s'affiche pas correctement

## Cause

Le code HTML colle est une **page complete** (avec `<html>`, `<head>`, `<script>`, Tailwind CDN, Font Awesome, animations CSS, etc.). Or le systeme actuel utilise `dangerouslySetInnerHTML` qui :

1. **Ignore les balises `<html>`, `<head>`, `<script>`** — donc Tailwind CDN et Font Awesome ne chargent jamais
2. **Les styles CSS du `<style>` entrent en conflit** avec les styles de l'application
3. **Les scripts inline (countdown, modal, scroll reveal) ne s'executent pas**

## Solution : utiliser un `<iframe srcdoc>` au lieu de `dangerouslySetInnerHTML`

Remplacer le rendu par un `<iframe>` avec l'attribut `srcdoc` qui isole completement le HTML dans un contexte sandboxe. Cela permet de charger les CDN, les styles, les scripts — exactement comme une page web independante.

## Modifications

### 1. `src/components/landing/LandingPageEditor.tsx` — Apercu editeur

Remplacer le `dangerouslySetInnerHTML` du panneau droit par un `<iframe srcdoc={previewHtml}>` :
- Si HTML custom → `srcdoc` contient le HTML complet tel quel
- Si pas de HTML custom → `srcdoc` contient le template par defaut genere
- L'iframe s'adapte au toggle mobile (375px) / desktop (100%)
- Style : `border: none`, largeur/hauteur 100%

### 2. `src/pages/ProductLanding.tsx` — Page publique

Meme changement : si `landing_html` existe, le rendre dans un `<iframe srcdoc>` pleine page au lieu de `dangerouslySetInnerHTML`. Les boutons "Commander" dans le HTML custom peuvent cibler `#order-form` via `window.parent` ou un lien ancre.

**Approche pour le formulaire de commande** : injecter automatiquement le formulaire de commande a l'interieur du `srcdoc` en bas du HTML, ou garder le formulaire en dehors de l'iframe avec un bouton qui scroll vers lui.

### 3. Fichiers concernes

| Fichier | Changement |
|---------|-----------|
| `src/components/landing/LandingPageEditor.tsx` | `dangerouslySetInnerHTML` → `<iframe srcdoc>` pour l'apercu |
| `src/pages/ProductLanding.tsx` | `dangerouslySetInnerHTML` → `<iframe srcdoc>` pour le rendu public + auto-resize iframe |

