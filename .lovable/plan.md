

## Plan: Rapport Détaillé des Livreurs (Point Journalier 8h30-8h30)

### Objectif
Créer un nouveau composant `DeliveryDailyReport.tsx` qui affiche un rapport détaillé de l'activité de chaque livreur sur la fenêtre 8h30-8h30, et l'intégrer dans le dashboard superviseur.

### Données par livreur

| Colonne | Source |
|---------|--------|
| Nom / Zone | `delivery_persons` + `profiles` |
| Statut actuel | `delivery_persons.status` |
| Commandes reçues | `orders` assignées dans la fenêtre |
| Livrées | `orders` status=delivered |
| Reportées | `orders` status=reported |
| Annulées | `orders` status=cancelled |
| En cours | status in (confirmed, in_transit, pending) |
| Taux de livraison | livrées / total * 100 |
| Montant total (CA) | somme `total_amount` des livrées |
| Montant encaissé | somme `amount_paid` des livrées |
| Reste à encaisser | CA - encaissé |
| Frais livreur | livrées × 1500 FCFA |
| À reverser | encaissé - frais livreur |

### UI
- Tableau scrollable avec une ligne par livreur
- En-tête avec badge de la plage horaire (ex: "14 Mars 08:30 → 15 Mars 08:30")
- Ligne de totaux en bas du tableau
- Code couleur: vert pour bons taux, rouge pour mauvais
- Badge statut du livreur (Disponible/En livraison/Hors ligne)
- Rafraîchissement auto 30s

### Fichiers

1. **Créer** `src/components/supervisor/DeliveryDailyReport.tsx` — Nouveau composant rapport livreurs
2. **Modifier** `src/pages/SupervisorDashboard.tsx` — Remplacer `StockOverviewPanel` par `DailyReportPanel` + `DeliveryDailyReport`, et retirer le doublon `DeliveryPerformance` (fusionné dans le nouveau rapport)

### Logique fenêtre temporelle

```text
function getDailyWindow():
  now = new Date()
  if now.hours > 8 || (now.hours === 8 && now.minutes >= 30):
    start = today 08:30
    end = tomorrow 08:30
  else:
    start = yesterday 08:30  
    end = today 08:30
  return { start, end }
```

### Architecture requêtes
- 1 requête `delivery_persons` (actifs) + `profiles` (noms)
- 1 requête `orders` dans la fenêtre, filtrée par `delivery_person_id IN [...]`
- Agrégation côté client par livreur
- Pas de migration DB nécessaire, toutes les colonnes existent déjà

