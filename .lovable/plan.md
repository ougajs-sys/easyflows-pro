

## Correction : Stabiliser l'enregistrement des tokens FCM

### Probleme actuel
Les fonctions `requestPermission` et `toggleNotifications` dans `usePushNotifications.ts` sont recreees a chaque rendu React, ce qui provoque une boucle infinie dans `useInitializePushNotifications.ts`. Le token FCM n'est jamais enregistre de maniere fiable.

### Corrections

**Fichier 1 : `src/hooks/usePushNotifications.ts`**
- Envelopper `requestPermission` dans `useCallback` avec les bonnes dependances
- Envelopper `toggleNotifications` dans `useCallback`
- Cela stabilise les references et empeche les re-rendus en boucle

**Fichier 2 : `src/hooks/useInitializePushNotifications.ts`**
- Ajouter un `useRef(false)` comme garde (`hasInitialized`) pour garantir que l'initialisation ne se fait qu'une seule fois par session
- Mettre `hasInitialized.current = true` des l'entree dans la fonction d'initialisation
- Retirer `requestPermission` des dependances du `useEffect` en utilisant une ref stable

### Resultat

- Le token FCM est enregistre **une seule fois** dans la table `user_push_tokens`
- Il persiste indefiniment en base de donnees
- Le Service Worker reste actif en arriere-plan et recoit les notifications meme quand l'app est fermee
- L'utilisateur n'a plus besoin de re-autoriser les notifications a chaque visite
- Les triggers SQL (commandes, messages) enverront les notifications via l'Edge Function vers FCM vers le navigateur de l'utilisateur

### Details techniques

```text
usePushNotifications.ts :
  const requestPermission = useCallback(async (): Promise<boolean> => {
    // ... meme logique existante
  }, [isSupported, toast]);

  const toggleNotifications = useCallback(async (enabled: boolean): Promise<void> => {
    // ... meme logique existante
  }, [toast]);

useInitializePushNotifications.ts :
  const hasInitialized = useRef(false);
  const requestPermissionRef = useRef(requestPermission);
  requestPermissionRef.current = requestPermission;

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializePush = async () => {
      // ... meme logique mais utilise requestPermissionRef.current
    };
    initializePush();
  }, [isSupported, isPermissionGranted]);
```

