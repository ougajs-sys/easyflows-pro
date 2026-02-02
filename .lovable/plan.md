
# Plan : Corriger les erreurs de build et renforcer la configuration de langue

## Contexte

L'application a actuellement **11 erreurs de build** qui empechent son fonctionnement. Ces erreurs sont liees a des problemes de typage TypeScript. De plus, nous devons ajouter les protections contre les traducteurs automatiques.

---

## Partie 1 : Corrections des erreurs de build (Prioritaire)

### 1.1 Fichier `src/hooks/usePresence.tsx`

**Probleme** : La table `profiles` ne contient pas de colonne `role`. Le role est stocke dans la table `user_roles`.

**Solution** : Modifier la requete pour joindre `user_roles` ou utiliser une sous-requete.

```typescript
// Ligne 82-86 - Avant
const { data: profiles, error: profilesError } = await supabase
  .from("profiles")
  .select("id, full_name, avatar_url, role")
  .in("role", allowedRoles)
  .neq("id", user.id);

// Apres - Utiliser user_roles pour le role
const { data: userRolesData } = await supabase
  .from("user_roles")
  .select("user_id, role")
  .in("role", allowedRoles);

const allowedUserIds = (userRolesData || []).map(ur => ur.user_id);

const { data: profiles, error: profilesError } = await supabase
  .from("profiles")
  .select("id, full_name, avatar_url")
  .in("id", allowedUserIds)
  .neq("id", user.id);
```

### 1.2 Fichier `src/hooks/useNotifications.tsx`

**Probleme** : Comparaison avec `'supervisor'` et `'admin'` au lieu des roles francais.

**Solution** : Utiliser les noms de roles corrects.

```typescript
// Ligne 240 - Avant
if (role === 'supervisor' || role === 'admin') {

// Apres
if (role === 'superviseur' || role === 'administrateur') {
```

### 1.3 Fichier `src/components/supervisor/SupervisorRevenueTracking.tsx`

**Probleme** : `RevenueDeposit` dans le hook ne definit pas la propriete `status`.

**Solution** : Ajouter `status` au type `RevenueDeposit` dans `useSupervisorRevenues.tsx`.

```typescript
// Dans src/hooks/useSupervisorRevenues.tsx, ligne 19-27
interface RevenueDeposit {
  id: string;
  deposited_by: string;
  total_amount: number;
  revenues_count: number;
  deposited_at: string;
  notes: string | null;
  status: string;  // AJOUTER CETTE LIGNE
  created_at: string;
}
```

### 1.4 Fichier `src/components/supervisor/ManualWithdrawalDialog.tsx`

**Probleme** : La fonction RPC `manual_withdrawal_from_delivery` n'existe pas dans les types.

**Solution** : Utiliser un type assertion pour contourner la verification de type.

```typescript
// Ligne 77 - Avant
const { data, error } = await supabase.rpc("manual_withdrawal_from_delivery", {...});

// Apres
const { data, error } = await (supabase.rpc as any)("manual_withdrawal_from_delivery", {...});
```

---

## Partie 2 : Configuration de la langue francaise

### 2.1 Fichier `index.html`

Ajouter les balises meta et attributs pour desactiver la traduction automatique :

```html
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Language" content="fr" />
  <meta name="google" content="notranslate" />
  <!-- autres meta... -->
</head>
<body class="notranslate" translate="no">
  <div id="root"></div>
</body>
```

### 2.2 Fichier `src/index.css`

Ajouter une regle CSS pour renforcer la desactivation :

```css
/* Empecher la traduction automatique des navigateurs */
.notranslate {
  translate: no;
}
```

---

## Resume des fichiers a modifier

| Fichier | Modification |
|---------|--------------|
| `src/hooks/usePresence.tsx` | Corriger la requete pour obtenir les roles depuis `user_roles` |
| `src/hooks/useNotifications.tsx` | Remplacer `'supervisor'`/`'admin'` par `'superviseur'`/`'administrateur'` |
| `src/hooks/useSupervisorRevenues.tsx` | Ajouter `status: string` au type `RevenueDeposit` |
| `src/components/supervisor/ManualWithdrawalDialog.tsx` | Utiliser type assertion pour l'appel RPC |
| `index.html` | Ajouter meta Content-Language, notranslate |
| `src/index.css` | Ajouter regle CSS `.notranslate` |

---

## Impact attendu

1. **Erreurs de build** : Toutes les 11 erreurs seront corrigees
2. **Traduction automatique** : Les navigateurs ne tenteront plus de traduire l'interface, evitant les crashes React lies a la modification du DOM
3. **Stabilite** : L'application sera plus stable pour les utilisateurs francophones
