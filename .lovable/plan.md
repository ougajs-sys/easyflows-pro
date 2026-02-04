

# Nouvelle Interface Agent IA - Design Moderne et Intuitif

## Vision

Créer une interface IA claire et élégante où l'utilisateur ne se perd jamais, avec 3 modes d'utilisation distincts accessibles via des onglets visuels.

---

## Architecture de l'Interface

L'interface sera organisée en **3 espaces distincts** accessibles par onglets :

```text
+------------------------------------------------------------------+
|  [Robot Icon] Agent IA                                            |
|  Votre assistant intelligent pour gérer la boutique              |
+------------------------------------------------------------------+
|                                                                    |
|  [ Parler ]    [ Actions ]    [ Conseils ]                       |
|  ─────────     ──────────     ──────────                         |
|                                                                    |
+------------------------------------------------------------------+
```

### Onglet 1 : "Parler" (Conversation libre)
Zone de chat simple et épuré :
- Grande zone de texte pour parler naturellement à l'IA
- Réponses affichées de manière conversationnelle (style chat)
- Suggestions de questions sous la zone de saisie
- Historique des dernières conversations dans un panneau latéral rétractable

### Onglet 2 : "Actions" (Actions rapides organisées)
Actions groupées par catégorie avec icônes visuelles :

```text
┌─────────────────────────────────────────────────────────────┐
│  OPÉRATIONS                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ [Users]      │ │ [Truck]      │ │ [Phone]      │         │
│  │ Distribuer   │ │ Distribuer   │ │ Distribuer   │         │
│  │ aux appelants│ │ aux livreurs │ │ confirmées   │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  CLIENTS & RELANCES                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ [CreditCard] │ │ [Star]       │ │ [AlertTriangle]        │
│  │ Relances     │ │ Suivi VIP    │ │ Stock critique│        │
│  │ paiements    │ │              │ │               │        │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  MARKETING (Nouveau)                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ [Sparkles]   │ │ [Send]       │ │ [TrendingUp] │         │
│  │ Analyser     │ │ Proposer     │ │ Relancer     │         │
│  │ opportunités │ │ campagne     │ │ inactifs     │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Onglet 3 : "Conseils" (Tableau de bord performance)
Vue d'ensemble avec score et recommandations :

```text
┌─────────────────────────────────────────────────────────────┐
│                     SCORE BOUTIQUE                           │
│                                                              │
│           ┌─────────────────────┐                           │
│           │        78           │  Correct !                │
│           │       /100          │  +5 vs hier               │
│           └─────────────────────┘                           │
│                                                              │
│  [Livraisons: 85%]  [Conversion: 72%]  [Stock: OK]          │
├─────────────────────────────────────────────────────────────┤
│  CE QU'IL FAUT FAIRE AUJOURD'HUI                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [!] 8 commandes attendent depuis ce matin     [Faire]  │ │
│  │ [!] Zone Nord surchargée - répartir          [Faire]  │ │
│  │ [i] Paul a besoin d'aide pour ses appels     [Voir]   │ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ACTIONS RAPIDES                                             │
│  [Diagnostic complet]  [Plan du jour]  [Coaching équipe]    │
└─────────────────────────────────────────────────────────────┘
```

---

## Composants à Créer

### 1. Page principale refaite
**`src/pages/AIAgent.tsx`** - Refonte complète avec les 3 onglets

### 2. Nouveaux composants
```text
src/components/ai-agent/
├── QuickActionConfigDialog.tsx  (existant)
├── AIConversation.tsx           (nouveau) - Zone de chat
├── AIQuickActions.tsx           (nouveau) - Grille d'actions par catégorie
├── AIPerformanceDashboard.tsx   (nouveau) - Score et conseils
├── AIScoreCircle.tsx            (nouveau) - Cercle de score animé
└── AIRecommendationCard.tsx     (nouveau) - Carte de recommandation
```

### 3. Hook enrichi
**`src/hooks/useAIAgent.tsx`** - Actions organisées par catégorie

---

## Design des Actions par Catégorie

Les actions seront groupées en 3 catégories visuellement distinctes :

| Catégorie | Couleur | Icône | Actions |
|-----------|---------|-------|---------|
| Opérations | Vert (primary) | Package | Distribution, Stock |
| Clients | Bleu | Users | VIP, Relances, Segments |
| Marketing | Doré (accent) | Sparkles | Campagnes, Opportunités |

---

## Éléments UX Clés

### Simplicité
- Maximum 6 actions visibles par catégorie
- Descriptions courtes (1 ligne max)
- Gros boutons avec icônes claires

### Guidance
- Suggestions contextuelles ("Commencez par...")
- Indicateurs visuels de priorité (badges colorés)
- Messages de confirmation simples

### Feedback
- Animations subtiles lors des actions
- Réponses IA affichées progressivement
- État de chargement visible mais non intrusif

---

## Exemple d'Interaction Utilisateur

L'utilisateur arrive sur la page :

1. **Premier écran** : L'onglet "Conseils" s'affiche par défaut avec le score du jour
2. **Alertes visibles** : "8 commandes attendent" avec bouton "Faire"
3. **Un clic** : L'IA distribue automatiquement et affiche "C'est fait ! 8 commandes réparties"
4. **Navigation simple** : Un clic sur "Actions" pour voir toutes les possibilités
5. **Besoin spécifique** : Un clic sur "Parler" pour demander quelque chose de personnalisé

---

## Mobile First

L'interface s'adaptera sur mobile :
- Onglets en bas de l'écran (style app mobile)
- Actions en grille 2 colonnes
- Score visible en permanence en haut
- Zone de chat plein écran avec clavier

---

## Fichiers à Modifier/Créer

### Fichiers à créer
1. `src/components/ai-agent/AIConversation.tsx`
2. `src/components/ai-agent/AIQuickActions.tsx`
3. `src/components/ai-agent/AIPerformanceDashboard.tsx`
4. `src/components/ai-agent/AIScoreCircle.tsx`
5. `src/components/ai-agent/AIRecommendationCard.tsx`

### Fichiers à modifier
1. `src/pages/AIAgent.tsx` - Refonte avec les 3 onglets
2. `src/hooks/useAIAgent.tsx` - Actions organisées par catégorie + nouvelles actions marketing/performance

### Backend (Edge Function)
1. `supabase/functions/ai-agent/index.ts` - Nouveaux outils marketing et performance + style de communication accessible

---

## Section Technique

### Structure des actions par catégorie

```typescript
// Dans useAIAgent.tsx
const actionCategories = {
  operations: {
    label: "Opérations",
    icon: "Package",
    color: "primary",
    actions: [
      { id: "distribute-pending", label: "Distribuer aux appelants", ... },
      { id: "distribute-confirmed-delivery", label: "Distribuer aux livreurs", ... },
      { id: "stock-alerts", label: "Alertes stock", ... },
    ]
  },
  clients: {
    label: "Clients & Relances", 
    icon: "Users",
    color: "blue",
    actions: [
      { id: "create-payment-followups", label: "Relances paiements", ... },
      { id: "vip-followups", label: "Suivi clients VIP", ... },
    ]
  },
  marketing: {
    label: "Marketing",
    icon: "Sparkles", 
    color: "accent",
    actions: [
      { id: "analyze-opportunities", label: "Analyser opportunités", ... },
      { id: "propose-campaign", label: "Proposer campagne", ... },
      { id: "reactivate-inactive", label: "Relancer inactifs", ... },
    ]
  },
  performance: {
    label: "Performance",
    icon: "TrendingUp",
    color: "success",
    actions: [
      { id: "global-diagnostic", label: "Diagnostic complet", ... },
      { id: "daily-plan", label: "Plan du jour", ... },
      { id: "team-coaching", label: "Coaching équipe", ... },
    ]
  }
};
```

### Nouveaux outils backend (ai-agent/index.ts)

```typescript
// Marketing tools
{ name: "analyze_marketing_opportunities", ... }
{ name: "generate_campaign", ... }
{ name: "create_and_schedule_campaign", ... }
{ name: "get_campaign_performance", ... }

// Performance tools
{ name: "analyze_global_performance", ... }
{ name: "get_performance_recommendations", ... }
{ name: "identify_bottlenecks", ... }
{ name: "generate_action_plan", ... }
```

### Style de communication (System Prompt)

```text
STYLE DE COMMUNICATION :
- Parle simplement, comme à un collègue
- Évite le jargon technique
- Commence par le résultat
- Donne des chiffres concrets (8 sur 10, pas 80%)
- Propose toujours une action suivante
```

---

## Résumé des Capacités Finales

Après implémentation, l'Agent IA pourra :

| Domaine | Capacités |
|---------|-----------|
| **Opérations** | Distribuer commandes, alertes stock, relances auto |
| **Marketing** | Analyser opportunités, générer campagnes, planifier envois |
| **Performance** | Score boutique, diagnostic équipe, plan d'action quotidien |
| **Communication** | Langage simple, direct, accessible à tous |

Tout cela dans une interface épurée à 3 onglets où l'utilisateur sait toujours où cliquer.

