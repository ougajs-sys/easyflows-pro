

## Plan: Envoi rapide par numéros collés (Quick Send)

### Concept
Ajouter un mode **"Envoi rapide"** dans la page Campagnes qui permet de coller directement des numéros de téléphone (séparés par virgules, espaces ou retours à la ligne) et d'envoyer un message WhatsApp/SMS immédiatement — sans passer par les segments clients.

### Ce qui existe déjà
La Edge Function `send-sms` accepte déjà un tableau `phones[]` + `message` + `type`. Il suffit donc d'ajouter l'UI côté frontend.

### Modifications

**1. `src/pages/Campaigns.tsx`** — Ajouter un onglet "Envoi rapide"

- Nouvel onglet `quick` dans les tabs existants (à côté de Campagnes, Templates, Test)
- UI simple:
  - `Textarea` pour coller les numéros (placeholder: `+2250102030405, +2250506070809...`)
  - Sélecteur canal (SMS / WhatsApp)
  - `Textarea` pour le message + accès aux templates
  - Compteur de numéros détectés + validation en temps réel
  - Badge indiquant combien de numéros valides / invalides
  - Bouton "Envoyer maintenant"
- Au clic: parse les numéros, appelle `send-sms` directement avec le tableau de phones
- Affiche le résultat (envoyés / échoués)

**2. Parsing des numéros** (dans le composant)

```text
Input: "+33787675645,+33675463423, 0102030405"
→ Split par virgule/espace/retour ligne
→ Trim chaque numéro
→ Afficher le compte: "3 numéros détectés"
```

Pas de validation CI stricte côté UI (la Edge Function s'en charge), mais afficher un warning si des numéros semblent non-ivoiriens.

### Pas de migration nécessaire
`send-sms` gère déjà tout côté serveur.

