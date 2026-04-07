
# Plan : Easy-Claw — Agent Marketing Autonome (IMPLEMENTÉ)

## Ce qui a été fait

### 1. Table `ai_campaign_proposals` (migration)
- Stocke les propositions de campagnes générées par Easy-Claw
- RLS : lecture/écriture réservée aux superviseurs et administrateurs

### 2. Edge Function `easy-claw-scheduler`
- Analyse autonome des données (commandes, taux, annulations, clients inactifs)
- Génère une proposition de campagne via Lovable AI
- Envoie des notifications internes (DM) ET WhatsApp aux admins/superviseurs
- Déduplication : max 2 propositions pending sur 3 jours

### 3. Edge Function `ai-agent` enrichie
- Rebrandée "Easy-Claw" dans le system prompt
- Contexte enrichi : taux d'annulation, commandes reportées, clients récupérables
- Actions rapides marketing ajoutées : récupération, funnel de conversion

### 4. UI — Nouvel onglet "Propositions"
- Onglet par défaut dans la page Agent IA
- Affiche les propositions pending avec analyse, segment, message
- Boutons Approuver / Rejeter
- Historique des propositions traitées

### 5. Cron job pg_cron
- Exécution automatique toutes les 48h à 8h du matin
