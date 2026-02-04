
# Importer 14 000+ Clients depuis un Fichier CSV (Côte d'Ivoire)

## Ce que je vais creer

Une fonctionnalite complete d'import de clients en masse depuis un fichier CSV, adaptee pour la Cote d'Ivoire et optimisee pour 14 000+ contacts.

## Fonctionnalites prevues

### 1. Bouton d'import sur la page Clients
- Nouveau bouton "Importer CSV" a cote de "Nouveau client"
- Icone Upload avec texte explicite

### 2. Composant d'import CSV complet
- Zone de depot de fichier (drag and drop) ou selection manuelle
- Previsualisation des 10 premieres lignes avant import
- Detection automatique du separateur (virgule ou point-virgule)
- Mappage intelligent des colonnes

### 3. Validation adaptee Cote d'Ivoire
Formats de numeros acceptes :
- 10 chiffres : 0102030405
- Avec indicatif : +225 0102030405
- Avec espaces : 01 02 03 04 05
- Prefixes valides : 01, 05, 07, 21, 22, 23, 24, 25, 27

### 4. Traitement par lots optimise pour 14 000+ contacts
- Import par lots de 500 clients pour eviter les timeouts
- Barre de progression visuelle avec pourcentage
- Estimation du temps restant
- Possibilite d'annuler l'import en cours

## Format CSV attendu

| Colonne CSV | Colonne BD | Obligatoire | Exemple |
|-------------|------------|-------------|---------|
| nom / full_name / name | full_name | Oui | Kouame Yao |
| telephone / phone / tel | phone | Oui | 0102030405 |
| ville / city | city | Non | Abidjan |
| zone / quartier | zone | Non | Cocody |
| adresse / address | address | Non | Rue des Jardins |
| notes / commentaire | notes | Non | Client fidele |

## Fichiers a creer/modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/components/clients/ClientImportDialog.tsx` | Creer | Composant principal avec dialog, dropzone et progression |
| `src/components/clients/ImportProgress.tsx` | Creer | Barre de progression avec stats en temps reel |
| `src/hooks/useClientImport.tsx` | Creer | Logique d'import par batch avec gestion d'erreurs |
| `src/lib/csvParser.ts` | Creer | Utilitaires de parsing et validation CSV |
| `src/lib/phoneValidation.ts` | Creer | Validation numeros ivoiriens |
| `src/pages/Clients.tsx` | Modifier | Ajouter le bouton d'import |

## Interface utilisateur

```text
+---------------------------------------------------+
|  Importer des clients                       [X]   |
+---------------------------------------------------+
|                                                   |
|  +---------------------------------------------+  |
|  |                                             |  |
|  |   [Icone Upload]                            |  |
|  |   Glissez votre fichier CSV ici             |  |
|  |   ou cliquez pour selectionner              |  |
|  |                                             |  |
|  |   Formats acceptes : .csv (max 20 MB)       |  |
|  +---------------------------------------------+  |
|                                                   |
|  Previsualisation (10 premiers) :                 |
|  +-------------+---------------+------------+     |
|  | Nom         | Telephone     | Ville      |     |
|  +-------------+---------------+------------+     |
|  | Kouame Yao  | 0507891234    | Abidjan    |     |
|  | Traore A.   | 0102030405    | Bouake     |     |
|  | ...         | ...           | ...        |     |
|  +-------------+---------------+------------+     |
|                                                   |
|  Resume :                                         |
|  [Vert] 13,847 clients valides                    |
|  [Orange] 153 doublons detectes                   |
|  [Rouge] 12 lignes invalides                      |
|                                                   |
|  En cas de doublon :                              |
|  ( ) Ignorer les doublons                         |
|  ( ) Mettre a jour les infos existantes           |
|                                                   |
|  [Annuler]              [Importer 13,847 clients] |
+---------------------------------------------------+
```

Pendant l'import :

```text
+---------------------------------------------------+
|  Import en cours...                               |
+---------------------------------------------------+
|                                                   |
|  [=================>                    ] 45%     |
|                                                   |
|  6,231 / 13,847 clients importes                  |
|  Temps restant estime : ~2 min 30 sec             |
|                                                   |
|  Lot actuel : 13 / 28                             |
|                                                   |
|  [Annuler l'import]                               |
+---------------------------------------------------+
```

## Gestion des doublons

Detection par numero de telephone (champ unique) :
1. **Ignorer** - Les clients existants ne sont pas modifies
2. **Mettre a jour** - Les nouvelles infos remplacent les anciennes (nom, ville)

## Securite et validation

- Validation des numeros de telephone (format ivoirien)
- Nettoyage des espaces et caracteres speciaux dans les numeros
- Limite de taille de fichier : 20 MB max
- Tous les clients importes sont marques segment "new"
- Encodage UTF-8 avec support des caracteres speciaux

## Details techniques

### Parsing CSV cote client
```typescript
// Detection automatique du separateur
const detectSeparator = (firstLine: string): string => {
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
};
```

### Validation telephone Cote d'Ivoire
```typescript
const normalizeIvorianPhone = (phone: string): string => {
  // Supprimer espaces, tirets, parentheses
  let cleaned = phone.replace(/[\s\-()\.]/g, '');
  
  // Gerer l'indicatif +225
  if (cleaned.startsWith('+225')) {
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith('225')) {
    cleaned = cleaned.substring(3);
  }
  
  // Verifier 10 chiffres et prefixe valide
  const validPrefixes = ['01', '05', '07', '21', '22', '23', '24', '25', '27'];
  if (cleaned.length === 10 && validPrefixes.some(p => cleaned.startsWith(p))) {
    return cleaned;
  }
  
  return ''; // Invalide
};
```

### Import par lots via Supabase
```typescript
const BATCH_SIZE = 500;
const importClients = async (clients: ClientInsert[]) => {
  for (let i = 0; i < clients.length; i += BATCH_SIZE) {
    const batch = clients.slice(i, i + BATCH_SIZE);
    
    const { error } = await supabase
      .from('clients')
      .upsert(batch, { 
        onConflict: 'phone',
        ignoreDuplicates: duplicateMode === 'ignore'
      });
    
    if (error) throw error;
    
    // Mise a jour progression
    setProgress((i + batch.length) / clients.length * 100);
  }
};
```

## Performance estimee

| Nombre de clients | Temps estime | Nombre de lots |
|-------------------|--------------|----------------|
| 5,000 | ~1 min | 10 lots |
| 10,000 | ~2 min | 20 lots |
| 14,000 | ~3 min | 28 lots |

## Resultat attendu

Apres cette implementation :
1. Tu verras un nouveau bouton "Importer CSV" sur la page Clients
2. Tu pourras glisser-deposer ton fichier de 14 000+ clients
3. Le systeme validera automatiquement les numeros ivoiriens
4. L'import se fera avec une barre de progression en temps reel
5. Tous tes clients seront disponibles pour les campagnes WhatsApp
