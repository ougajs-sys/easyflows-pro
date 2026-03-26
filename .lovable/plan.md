
# Plan : Supprimer ConnectedWorkers et DeliveryStatus du tableau de bord superviseur

## Modifications dans `src/pages/SupervisorDashboard.tsx`

- Supprimer les imports de `ConnectedWorkers` et `DeliveryStatus`
- Supprimer leurs blocs JSX

**Nouvel ordre des sections :**
1. SupervisorStats
2. DailyReportPanel
3. DeliveryDailyReport
4. CallerPerformance
5. SalesSummary

Les composants restent dans le code source, ils ne sont juste plus affichés sur cette page.

## Fichier modifié
- `src/pages/SupervisorDashboard.tsx`
