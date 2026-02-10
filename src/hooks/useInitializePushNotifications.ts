import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { usePushNotifications } from "./usePushNotifications";
import { supabase } from "@/integrations/supabase/client";

export function useInitializePushNotifications() {
  const { isSupported, isPermissionGranted, requestPermission } = usePushNotifications();
  const location = useLocation();

  useEffect(() => {
    const initializePush = async () => {
      // Skip push notifications on public embed routes
      if (location.pathname.startsWith('/embed/')) {
        console.log('[Push Notifications] Skipping initialization on embed route');
        return;
      }

      // Only proceed if supported and user is authenticated
      if (!isSupported) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has any tokens registered
      const { data: tokens } = await supabase
        .from('user_push_tokens')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      // If no tokens and permission not yet asked, request permission automatically
      if (!tokens || tokens.length === 0) {
        if (Notification.permission === 'default') {
          // Request permission automatically on first login
          setTimeout(() => {
            requestPermission();
          }, 2000); // Delay to avoid overwhelming the user
        }
      } else if (isPermissionGranted) {
        // Token exists but maybe needs refresh - silently try to get new token
        requestPermission().catch(console.error);
      }
    };

    initializePush();
  }, [isSupported, isPermissionGranted, requestPermission, location.pathname]);
}
