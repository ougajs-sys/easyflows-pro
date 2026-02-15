import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2, RefreshCw, Smartphone } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function PushNotificationSettings() {
  const { user } = useAuth();
  const { isSupported, isChecking, isPermissionGranted, isLoading, requestPermission, toggleNotifications, refreshToken } = usePushNotifications();
  const [isEnabled, setIsEnabled] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const loadNotificationStatus = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_push_tokens')
          .select('is_enabled')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          setIsEnabled(data.is_enabled);
        }
      } catch (error) {
        console.error("Error loading notification status:", error);
      } finally {
        setLoadingStatus(false);
      }
    };

    loadNotificationStatus();
  }, [user]);

  const handleToggle = async (checked: boolean) => {
    if (checked && !isPermissionGranted) {
      const granted = await requestPermission();
      if (granted) {
        setIsEnabled(true);
      }
    } else {
      await toggleNotifications(checked);
      setIsEnabled(checked);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const ok = await refreshToken();
    if (ok) {
      setIsEnabled(true);
    }
    setIsRefreshing(false);
  };

  // Loading state while checking support
  if (isChecking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications Push
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Vérification de la compatibilité...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Not supported — show platform-specific instructions
  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Notifications Push
          </CardTitle>
          <CardDescription>
            Les notifications push ne sont pas disponibles sur ce navigateur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-muted bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-medium">Pour activer les notifications :</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
              <li><strong>Android</strong> : Ouvrez l'app dans Chrome, puis installez-la via le menu ⋮ → « Installer l'application »</li>
              <li><strong>iPhone/iPad</strong> : Ouvrez dans Safari, appuyez sur Partager → « Sur l'écran d'accueil » (iOS 16.4+)</li>
              <li><strong>PC/Mac</strong> : Utilisez Chrome, Edge ou Firefox à jour</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          Notifications Push
        </CardTitle>
        <CardDescription>
          Recevez des notifications pour les nouvelles commandes, messages et assignations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications" className="text-base">
              Activer les notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Soyez notifié en temps réel des événements importants
            </p>
          </div>
          {loadingStatus || isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Switch
              id="push-notifications"
              checked={isEnabled}
              onCheckedChange={handleToggle}
            />
          )}
        </div>

        {!isPermissionGranted && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 p-4">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              Les notifications ne sont pas autorisées dans votre navigateur. Activez-les pour recevoir des alertes en temps réel.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => requestPermission()}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Autoriser les notifications
            </Button>
          </div>
        )}

        {isPermissionGranted && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full"
          >
            {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Réactiver / Rafraîchir le token
          </Button>
        )}

        <div className="text-sm text-muted-foreground space-y-2">
          <p className="font-medium">Vous serez notifié pour:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Nouvelles commandes (admin & superviseurs)</li>
            <li>Assignation de commandes (appelants)</li>
            <li>Nouvelles livraisons (livreurs)</li>
            <li>Messages directs</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
