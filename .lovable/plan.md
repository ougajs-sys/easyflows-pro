
## Rendre la barre de recherche globale fonctionnelle

### Probleme
La barre de recherche dans le header du `DashboardLayout` (utilisee par les superviseurs et administrateurs) est purement decorative : c'est un simple `<input>` sans etat, sans gestionnaire d'evenements et sans logique de recherche. Les layouts des appelants (`CallerLayout`) et livreurs (`DeliveryLayout`) n'ont meme pas de barre de recherche.

### Solution
Creer un composant de recherche globale (`GlobalSearch`) qui :
- Recherche en temps reel dans les **commandes** (par numero, nom du client, telephone)
- Recherche dans les **clients** (par nom, telephone, ville)
- Recherche dans les **livreurs/profils** (par nom)
- Affiche les resultats dans un menu deroulant sous la barre de recherche
- Navigue vers la page concernee quand l'utilisateur clique sur un resultat

### Fichiers a creer/modifier

**1. Nouveau composant : `src/components/layout/GlobalSearch.tsx`**
- Composant autonome avec etat de recherche, debounce (300ms)
- 3 requetes Supabase en parallele : `orders`, `clients`, `profiles`
- Affichage des resultats groupes par categorie (Commandes, Clients, Personnes)
- Limite a 5 resultats par categorie pour la performance
- Clic sur un resultat : navigation vers `/orders`, `/clients`, ou `/profile`
- Fermeture du dropdown au clic exterieur ou sur Echap
- Recherche declenchee a partir de 2 caracteres

**2. Modifier : `src/components/layout/DashboardLayout.tsx`**
- Remplacer le `<input>` statique par le composant `<GlobalSearch />`
- Aucun autre changement dans le layout

### Details techniques

Le composant `GlobalSearch` effectuera 3 requetes Supabase simultanees :

```text
orders:   .select('id, order_number, status, total_amount, client:clients(full_name, phone)')
          .or('order_number.ilike.%query%, client_phone.ilike.%query%')
          .limit(5)

clients:  .select('id, full_name, phone, city, zone')
          .or('full_name.ilike.%query%, phone.ilike.%query%, city.ilike.%query%')
          .limit(5)

profiles: .select('id, full_name, phone')
          .ilike('full_name', '%query%')
          .limit(5)
```

Les resultats s'afficheront dans un dropdown positionne sous la barre de recherche avec :
- Icone + texte pour chaque resultat
- Categorie en en-tete de section
- Animation d'ouverture/fermeture fluide
- Indicateur de chargement pendant la recherche
- Message "Aucun resultat" si rien ne correspond

### Resultat attendu
- La recherche fonctionne pour tous les roles utilisant le `DashboardLayout` (superviseur, administrateur, appelant sur les pages globales)
- Les resultats apparaissent en temps reel pendant la saisie
- Un clic sur un resultat redirige vers la page appropriee
- La recherche est fluide grace au debounce de 300ms
