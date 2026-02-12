import { useEffect, useRef } from "react";
import { usePushNotifications } from "./usePushNotifications";
import { supabase } from "@/integrations/supabase/client";

export function useInitializePushNotifications() {
  const { isSupported, isPermissionGranted, requestPermission } = usePushNotifications();
  const hasInitialized = useRef(false);
  const requestPermissionRef = useRef(requestPermission);
  requestPermissionRef.current = requestPermission;

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializePush = async () => {
      if (!isSupported) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tokens } = await supabase
        .from('user_push_tokens')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (!tokens || tokens.length === 0) {
        if (Notification.permission === 'default') {
          setTimeout(() => {
            requestPermissionRef.current();
          }, 2000);
        }
      } else if (isPermissionGranted) {
        requestPermissionRef.current().catch(console.error);
      }
    };

    initializePush();
  }, [isSupported, isPermissionGranted]);
}
