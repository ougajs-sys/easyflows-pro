
# Plan : Correction Definitive de l'Erreur React Hooks dans FloatingChat

## Probleme Identifie

L'erreur "Should have a queue" est une violation de la regle fondamentale des hooks React :

**Les hooks doivent etre appeles dans le meme ordre a chaque rendu.**

Dans `FloatingChat.tsx`, le early return conditionnel (lignes 89-92) se produit APRES l'appel aux hooks, mais le probleme est plus subtil :

```tsx
// Ligne 52 - usePresence appelle useMutation/useQuery en interne
const { onlineUsers, isLoading: presenceLoading } = usePresence();

// Ligne 55-63 - useDirectMessages appelle useMutation/useQuery en interne
const { messages, ... } = useDirectMessages(selectedContact?.user_id);

// ... autres hooks useState/useEffect ...

// Ligne 89-92 - Early return
if (!user || ...) {
  return null;
}
```

Le probleme reel est que `useDirectMessages` et `usePresence` appellent des hooks React Query en interne, et lorsque le composant se rerender avec des conditions differentes, l'ordre des hooks internes peut devenir incoherent.

## Solution Proposee

### 1. Deplacer les conditions AVANT tous les hooks dependants

La solution est de restructurer le composant pour que :
- Les hooks de base (`useAuth`, `useLocation`) soient appeles en premier
- Le rendu conditionnel soit gere APRES tous les hooks
- Le composant ne retourne jamais null avant d'avoir execute tous ses hooks

### 2. Modifier FloatingChat.tsx

```tsx
export function FloatingChat() {
  const { user, role } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<UserPresence | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Determiner si le chat doit etre affiche AVANT d'appeler les hooks dependants
  const shouldShow = !!user && 
    location.pathname !== '/auth' && 
    !location.pathname.startsWith('/embed');

  // TOUJOURS appeler ces hooks, meme si shouldShow est false
  // Ils sont configures avec enabled: false quand l'utilisateur n'est pas connecte
  const { onlineUsers, isLoading: presenceLoading } = usePresence();
  
  // Passer undefined si pas de contact selectionne OU si on ne doit pas afficher
  const contactId = shouldShow ? selectedContact?.user_id : undefined;
  const {
    messages,
    messagesLoading,
    sendMessage,
    sendingMessage,
    markAsRead,
    unreadCounts,
    totalUnread,
  } = useDirectMessages(contactId);

  // useEffect pour auto-scroll - TOUJOURS appele
  useEffect(() => {
    if (!shouldShow) return;
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, shouldShow]);

  // useEffect pour markAsRead - TOUJOURS appele
  useEffect(() => {
    if (!shouldShow) return;
    if (selectedContact?.user_id) {
      const unreadCount = unreadCounts[selectedContact.user_id] || 0;
      if (unreadCount > 0) {
        const timeoutId = setTimeout(() => {
          markAsRead(selectedContact.user_id);
        }, 300);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [selectedContact?.user_id, unreadCounts, markAsRead, shouldShow]);

  // MAINTENANT on peut faire le rendu conditionnel
  // Cela ne viole pas la regle des hooks car tous les hooks ont ete appeles
  if (!shouldShow) {
    return null;
  }

  // ... reste du composant ...
}
```

### 3. Verifier que usePresence et useDirectMessages gerent le cas user=null

Les deux hooks doivent avoir `enabled: !!user?.id` pour eviter les requetes inutiles.

## Fichiers a Modifier

| Fichier | Modification |
|---------|-------------|
| `src/components/chat/FloatingChat.tsx` | Restructurer pour appeler tous les hooks avant le rendu conditionnel |

## Flux Corrige

```text
AVANT (Crash)                           APRES (Stable)
=============                           ==============
User connecte                           User connecte
  |                                       |
useAuth() -> user                       useAuth() -> user
usePresence() -> hooks internes         shouldShow = true
useDirectMessages() -> hooks internes   usePresence() -> execute
  |                                     useDirectMessages() -> execute
User se deconnecte                        |
  |                                     User se deconnecte
useAuth() -> null                         |
if (!user) return null  <-- SKIP        useAuth() -> null
                             hooks      shouldShow = false
  |                                     usePresence() -> enabled: false
React reconciliation ERROR              useDirectMessages() -> enabled: false
  |                                       |
CRASH "Should have a queue"             if (!shouldShow) return null
                                          |
                                        OK - Tous les hooks ont ete appeles
```

## Points Cles de la Solution

1. **Tous les hooks sont toujours appeles** : meme quand le composant ne s'affiche pas
2. **Les hooks sont desactives** via `enabled: false` quand non necessaires
3. **Le early return** ne viole plus la regle des hooks car il se fait APRES
4. **Les useEffect** incluent `shouldShow` dans leurs conditions internes
5. **Pas d'impact sur les performances** : les hooks avec `enabled: false` ne font pas de requetes

## Resultat Attendu

- Plus d'erreur "Should have a queue"
- Le chat flottant apparait/disparait sans crash
- Navigation vers /auth sans erreur
- Deconnexion sans erreur
- Le composant est stable dans toutes les conditions
