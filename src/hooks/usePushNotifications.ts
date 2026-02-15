import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { firebaseConfig, vapidKey } from "@/config/firebase";

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isChecking: boolean;
  isPermissionGranted: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  toggleNotifications: (enabled: boolean) => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    let cancelled = false;

    const checkSupport = async () => {
      // Step 1: Quick synchronous check
      const hasNotification = 'Notification' in window;
      const hasServiceWorker = 'serviceWorker' in navigator;

      if (!hasNotification || !hasServiceWorker) {
        if (!cancelled) {
          setIsSupported(false);
          setIsChecking(false);
        }
        return;
      }

      // Update permission state
      if (!cancelled) {
        setIsPermissionGranted(Notification.permission === 'granted');
      }

      // Step 2: Wait for SW ready then check PushManager
      try {
        const registration = await navigator.serviceWorker.ready;
        if (!cancelled) {
          const hasPush = 'PushManager' in window && !!registration.pushManager;
          setIsSupported(hasPush);
          setIsChecking(false);
        }
      } catch {
        if (!cancelled) {
          setIsSupported(false);
          setIsChecking(false);
        }
      }
    };

    checkSupport().then(() => {
      // If not supported after first check, retry after 3s (SW may still be installing)
      if (!cancelled) {
        retryTimeoutRef.current = setTimeout(() => {
          if (!cancelled) {
            checkSupport();
          }
        }, 3000);
      }
    });

    return () => {
      cancelled = true;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  const initializeFirebase = async () => {
    try {
      const { initializeApp, getApps } = await import('firebase/app');
      const { getMessaging, getToken, onMessage } = await import('firebase/messaging');

      const apps = getApps();
      const app = apps.length === 0 ? initializeApp(firebaseConfig) : apps[0];
      const messaging = getMessaging(app);

      return { messaging, getToken, onMessage };
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      throw error;
    }
  };

  const getTokenAndSave = useCallback(async (): Promise<boolean> => {
    try {
      let swRegistration: ServiceWorkerRegistration | undefined;
      try {
        swRegistration = await navigator.serviceWorker.ready;
      } catch (swError) {
        console.warn("Service worker not available:", swError);
      }

      const { messaging, getToken } = await initializeFirebase();

      const currentToken = await getToken(messaging, {
        vapidKey: vapidKey,
        ...(swRegistration ? { serviceWorkerRegistration: swRegistration } : {}),
      });

      if (!currentToken) {
        throw new Error("Impossible d'obtenir le token FCM");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Utilisateur non connecté");
      }

      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: user.id,
          token: currentToken,
          platform: 'web',
          is_enabled: true,
          last_seen_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,token'
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error getting/saving FCM token:", error);
      return false;
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      toast({
        title: "Non supporté",
        description: "Votre navigateur ne supporte pas les notifications push.",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);

    try {
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        toast({
          title: "Permission refusée",
          description: "Vous devez autoriser les notifications pour recevoir les alertes.",
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }

      setIsPermissionGranted(true);

      const saved = await getTokenAndSave();

      if (saved) {
        toast({
          title: "Notifications activées",
          description: "Vous recevrez désormais des notifications push.",
        });
      } else {
        throw new Error("Échec de l'enregistrement du token");
      }

      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error("Error requesting notification permission:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'activer les notifications.",
        variant: "destructive",
      });
      setIsLoading(false);
      return false;
    }
  }, [toast, getTokenAndSave]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!isSupported || Notification.permission !== 'granted') {
      return false;
    }
    return getTokenAndSave();
  }, [isSupported, getTokenAndSave]);

  const toggleNotifications = useCallback(async (enabled: boolean): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Utilisateur non connecté");
      }

      const { error } = await supabase
        .from('user_push_tokens')
        .update({ is_enabled: enabled })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: enabled ? "Notifications activées" : "Notifications désactivées",
        description: enabled
          ? "Vous recevrez désormais des notifications push."
          : "Vous ne recevrez plus de notifications push.",
      });
    } catch (error: any) {
      console.error("Error toggling notifications:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier les notifications.",
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    isSupported,
    isChecking,
    isPermissionGranted,
    isLoading,
    requestPermission,
    toggleNotifications,
    refreshToken,
  };
}
