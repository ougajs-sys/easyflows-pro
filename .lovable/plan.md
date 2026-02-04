
# Plan : Formation Interactive pour Appelants

## Vue d'ensemble

Je vais transformer le module de formation actuel (avec des placeholders) en une experience interactive complete avec :
- Contenu textuel pratique etape par etape
- Quiz interactif avec questions/reponses
- Navigation par sections dans les modules longs
- Feedback immediat sur les reponses

## Modifications Techniques

### Fichier a modifier
`src/components/caller/CallerTraining.tsx`

### Structure du nouveau composant

```text
CallerTraining
    |
    +-- TrainingContent (nouveau)
    |       |-- Contenu par etapes avec navigation
    |       |-- Boutons Precedent/Suivant
    |       |-- Indicateur de progression
    |
    +-- QuizContent (nouveau)
            |-- Questions avec options cliquables
            |-- Feedback correct/incorrect
            |-- Score final
```

### Contenu Interactif par Module

#### Module 1 : Techniques d'appel (3 etapes)
**Etape 1 - Avant l'appel**
- Ouvrir la fiche client
- Lire l'historique des commandes
- Preparer 2-3 produits a proposer

**Etape 2 - Pendant l'appel**
- Saluer avec energie
- Verifier la disponibilite (30 secondes)
- Ecouter 60%, parler 40%

**Etape 3 - Apres l'appel**
- Enregistrer immediatement
- Noter les infos importantes
- Programmer un suivi si besoin

#### Module 2 : Scripts de vente (3 scripts)
- Script nouveau client
- Script client existant  
- Script relance abandon

#### Module 3 : Gestion des objections (4 objections)
- "C'est trop cher" - Reponse valeur
- "Je vais reflechir" - Creer l'urgence
- "Pas le temps" - Pitch 30 secondes
- "Pas interesse" - Question ouverte

#### Module 4 : Utilisation plateforme (5 actions)
- Creer une commande
- Ajouter un client
- Voir les stats
- Programmer un suivi
- Discuter avec superviseur

#### Module 5 : Processus confirmation (Checklist interactive)
- 6 verifications obligatoires avec cases a cocher
- Section "Si probleme"
- Section "Apres confirmation"

#### Module 6 : Quiz (4 questions)
- Question 1 : Ratio ecoute/parole (reponse: 60%)
- Question 2 : Objection "trop cher" (reponse: Expliquer la valeur)
- Question 3 : Premiere chose avant d'appeler (reponse: Fiche client)
- Question 4 : Client agressif (reponse: Rester calme, escalader)

### Fonctionnalites Interactives

| Fonctionnalite | Description |
|----------------|-------------|
| Navigation par etapes | Boutons Precedent/Suivant dans chaque module |
| Progression visuelle | Indicateur "Etape 2/5" avec barre de progression |
| Quiz cliquable | Cliquer sur une reponse = feedback immediat |
| Checklist cochable | Cases a cocher pour le processus de confirmation |
| Score quiz | Affichage du score a la fin (ex: 3/4 bonnes reponses) |
| Animation feedback | Vert pour correct, rouge pour incorrect |

### Experience Utilisateur

```text
Utilisateur clique sur "Scripts de vente"
        |
        v
Dialog s'ouvre avec Script 1
        |
[Precedent] [1] [2] [3] [Suivant]
        |
        v
Utilisateur lit le script
        |
        v
Clique "Suivant" -> Script 2
        |
        v
Termine les 3 scripts
        |
        v
Bouton "Marquer comme termine" apparait
```

### Pour le Quiz

```text
Question affichee
        |
        v
4 options cliquables (A, B, C, D)
        |
        v
Utilisateur clique une option
        |
        v
Feedback immediat (vert/rouge + explication)
        |
        v
Bouton "Question suivante"
        |
        v
Apres 4 questions -> Score final
        |
        v
Si score >= 3/4 -> Module complete automatiquement
```

## Resultat Attendu

- Les appelants peuvent naviguer dans le contenu a leur rythme
- Le quiz teste vraiment leurs connaissances
- Le contenu est pratique et directement applicable
- La progression est sauvegardee localement
- Experience fluide sur mobile et desktop
