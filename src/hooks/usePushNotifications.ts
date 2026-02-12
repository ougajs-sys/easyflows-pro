import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { firebaseConfig, vapidKey } from "@/config/firebase";

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isPermissionGranted: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  toggleNotifications: (enabled: boolean) => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if browser supports push notifications
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      setIsPermissionGranted(Notification.permission === 'granted');
    }
  }, []);

  const initializeFirebase = async () => {
    try {
      // Dynamic import of Firebase
      const { initializeApp, getApps } = await import('firebase/app');
      const { getMessaging, getToken, onMessage } = await import('firebase/messaging');

      // Initialize Firebase if not already initialized
      const apps = getApps();
      const app = apps.length === 0 ? initializeApp(firebaseConfig) : apps[0];
      
      // Get messaging instance
      const messaging = getMessaging(app);

      return { messaging, getToken, onMessage };
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      throw error;
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: "Non supporté",
        description: "Votre navigateur ne supporte pas les notifications push.",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);

    try {
      // Request notification permission
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

      // Wait for the service worker to be ready (registered by vite-plugin-pwa)
      let swRegistration: ServiceWorkerRegistration | undefined;
      try {
        swRegistration = await navigator.serviceWorker.ready;
      } catch (swError) {
        console.warn("Service worker not available:", swError);
      }

      // Initialize Firebase and get token
      const { messaging, getToken } = await initializeFirebase();

      // Get registration token - MUST pass serviceWorkerRegistration
      // so Firebase uses our existing SW instead of looking for /firebase-messaging-sw.js
      const currentToken = await getToken(messaging, {
        vapidKey: vapidKey,
        ...(swRegistration ? { serviceWorkerRegistration: swRegistration } : {}),
      });

      if (!currentToken) {
        throw new Error("Impossible d'obtenir le token FCM");
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Utilisateur non connecté");
      }

      // Save token to database
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

      toast({
        title: "Notifications activées",
        description: "Vous recevrez désormais des notifications push.",
      });

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
  };

  const toggleNotifications = async (enabled: boolean): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Utilisateur non connecté");
      }

      // Update all tokens for this user
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
  };

  return {
    isSupported,
    isPermissionGranted,
    isLoading,
    requestPermission,
    toggleNotifications,
  };
}
