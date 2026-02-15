import { useEffect, useRef, useState } from "react";
import { usePushNotifications } from "./usePushNotifications";
import { supabase } from "@/integrations/supabase/client";

export function useInitializePushNotifications() {
  const { isSupported, isChecking, isPermissionGranted, requestPermission, refreshToken } = usePushNotifications();
  const [hasRegistered, setHasRegistered] = useState(false);
  const requestPermissionRef = useRef(requestPermission);
  const refreshTokenRef = useRef(refreshToken);
  requestPermissionRef.current = requestPermission;
  refreshTokenRef.current = refreshToken;

  // Auto-register when support is confirmed
  useEffect(() => {
    if (isChecking || !isSupported || hasRegistered) return;

    const tryRegister = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (Notification.permission === 'granted') {
        // Permission already granted — refresh token silently
        const ok = await refreshTokenRef.current();
        if (ok) setHasRegistered(true);
      } else if (Notification.permission === 'default') {
        // First time — request permission
        const ok = await requestPermissionRef.current();
        if (ok) setHasRegistered(true);
      }
    };

    tryRegister();
  }, [isSupported, isChecking, hasRegistered]);

  // Re-register on every SIGNED_IN event (login, token refresh)
  useEffect(() => {
    if (isChecking || !isSupported) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' && Notification.permission === 'granted') {
        const ok = await refreshTokenRef.current();
        if (ok) setHasRegistered(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [isSupported, isChecking]);
}
