import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { requestNotificationPermission, onForegroundMessage } from "@/lib/firebase";
import { toast } from "sonner";

export function usePushNotifications() {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>("default");

  // Check current permission status and user's preference
  useEffect(() => {
    if (!user) return;

    // Check browser permission
    if ("Notification" in window) {
      setPermissionState(Notification.permission);
    }

    // Check user's push notification preference from database
    const checkUserPreference = async () => {
      const { data, error } = await supabase
        .from("user_push_tokens")
        .select("is_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setIsEnabled(data.is_enabled);
      }
    };

    checkUserPreference();
  }, [user]);

  // Listen for foreground messages
  useEffect(() => {
    if (!user || permissionState !== "granted") return;

    const unsubscribe = onForegroundMessage((payload) => {
      console.log("Foreground push notification received:", payload);
      
      // Show toast notification
      if (payload.notification) {
        toast(payload.notification.title, {
          description: payload.notification.body,
        });
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [user, permissionState]);

  // Request permission and register token
  const enablePushNotifications = async (): Promise<boolean> => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return false;
    }

    setIsLoading(true);

    try {
      // Request permission and get FCM token
      const token = await requestNotificationPermission();

      if (!token) {
        toast.error("Impossible d'obtenir le jeton de notification");
        setIsLoading(false);
        return false;
      }

      // Get device info
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
      };

      // Upsert token to database with is_enabled: true
      const { error } = await supabase
        .from("user_push_tokens")
        .upsert(
          {
            user_id: user.id,
            token: token,
            device_info: deviceInfo,
            is_enabled: true,
          },
          {
            onConflict: "user_id,token",
          }
        );

      if (error) {
        console.error("Error saving push token:", error);
        toast.error("Erreur lors de l'enregistrement du jeton");
        setIsLoading(false);
        return false;
      }

      setIsEnabled(true);
      setPermissionState(Notification.permission);
      toast.success("Notifications push activées !");
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error enabling push notifications:", error);
      toast.error("Erreur lors de l'activation des notifications");
      setIsLoading(false);
      return false;
    }
  };

  // Disable push notifications
  const disablePushNotifications = async (): Promise<boolean> => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return false;
    }

    setIsLoading(true);

    try {
      // Update all user's tokens to is_enabled: false
      const { error } = await supabase
        .from("user_push_tokens")
        .update({ is_enabled: false })
        .eq("user_id", user.id);

      if (error) {
        console.error("Error disabling push notifications:", error);
        toast.error("Erreur lors de la désactivation");
        setIsLoading(false);
        return false;
      }

      setIsEnabled(false);
      toast.success("Notifications push désactivées");
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error disabling push notifications:", error);
      toast.error("Erreur lors de la désactivation");
      setIsLoading(false);
      return false;
    }
  };

  // Toggle push notifications
  const togglePushNotifications = async (): Promise<void> => {
    if (isEnabled) {
      await disablePushNotifications();
    } else {
      await enablePushNotifications();
    }
  };

  return {
    isEnabled,
    isLoading,
    permissionState,
    enablePushNotifications,
    disablePushNotifications,
    togglePushNotifications,
  };
}
