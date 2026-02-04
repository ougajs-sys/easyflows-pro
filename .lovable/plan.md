

# Ajouter le Panneau de Test SMS/WhatsApp à la page Campagnes

## Le Problème

Le composant `SmsTestPanel` existe dans le code mais **n'est pas affiché** sur la page Campagnes. Il manque l'import et l'intégration dans l'interface.

## Ce que je vais faire

### Étape 1 : Importer le composant

Ajouter l'import du `SmsTestPanel` dans `src/pages/Campaigns.tsx` :
```typescript
import { SmsTestPanel } from "@/components/sms/SmsTestPanel";
```

### Étape 2 : Ajouter un nouvel onglet "Test"

Modifier les onglets existants pour ajouter un troisième onglet :

| Actuel | Nouveau |
|--------|---------|
| Campagnes, Templates | Campagnes, Templates, **Test** |

### Étape 3 : Afficher le panneau de test

Dans l'onglet "Test", afficher le composant `SmsTestPanel` qui permet de :
- Entrer un numéro de téléphone
- Choisir le canal (SMS ou WhatsApp)
- Sélectionner un type de notification
- Envoyer un message test

## Résultat attendu

Après cette modification, tu verras :
1. Un nouvel onglet **"Test"** à côté de "Campagnes" et "Templates"
2. En cliquant sur "Test", le panneau de test SMS/WhatsApp apparaîtra
3. Tu pourras tester l'envoi WhatsApp avec ton numéro

## Fichier à modifier

| Fichier | Modification |
|---------|-------------|
| `src/pages/Campaigns.tsx` | Import + nouvel onglet + affichage du composant |

