import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Share, PlusSquare, MoreVertical, CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Check if already installed
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isIOSStandalone = (navigator as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone || isIOSStandalone);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Application installée !</CardTitle>
            <CardDescription>
              EasyFlows Pro est maintenant disponible sur votre écran d'accueil.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Aller au tableau de bord
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center pt-8 pb-4">
          <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <span className="text-3xl font-bold text-primary-foreground">E</span>
          </div>
          <h1 className="text-2xl font-bold">Installer EasyFlows Pro</h1>
          <p className="text-muted-foreground mt-2">
            Accédez à l'application directement depuis votre écran d'accueil
          </p>
        </div>

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Pourquoi installer ?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Accès rapide</p>
                <p className="text-sm text-muted-foreground">
                  Lancez l'app en un clic depuis votre écran d'accueil
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Mode plein écran</p>
                <p className="text-sm text-muted-foreground">
                  Interface immersive sans barre de navigation
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Chargement rapide</p>
                <p className="text-sm text-muted-foreground">
                  Les ressources sont mises en cache pour un accès instantané
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Install Button (Chrome/Edge) */}
        {deferredPrompt && (
          <Button onClick={handleInstallClick} className="w-full h-14 text-lg" size="lg">
            <Download className="w-5 h-5 mr-2" />
            Installer maintenant
          </Button>
        )}

        {/* iOS Instructions */}
        {isIOS && !deferredPrompt && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Instructions pour iPhone/iPad</CardTitle>
              <CardDescription>Suivez ces étapes pour installer l'application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-semibold text-primary">1</span>
                </div>
                <div className="flex items-center gap-2">
                  <p>Appuyez sur le bouton</p>
                  <Share className="w-5 h-5 text-primary" />
                  <p>Partager</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-semibold text-primary">2</span>
                </div>
                <div className="flex items-center gap-2">
                  <p>Sélectionnez</p>
                  <PlusSquare className="w-5 h-5 text-primary" />
                  <p>"Sur l'écran d'accueil"</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-semibold text-primary">3</span>
                </div>
                <p>Confirmez en appuyant sur "Ajouter"</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Android Instructions (fallback if no prompt) */}
        {isAndroid && !deferredPrompt && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Instructions pour Android</CardTitle>
              <CardDescription>Suivez ces étapes pour installer l'application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-semibold text-primary">1</span>
                </div>
                <div className="flex items-center gap-2">
                  <p>Appuyez sur</p>
                  <MoreVertical className="w-5 h-5 text-primary" />
                  <p>en haut à droite</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-semibold text-primary">2</span>
                </div>
                <p>Sélectionnez "Installer l'application" ou "Ajouter à l'écran d'accueil"</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-semibold text-primary">3</span>
                </div>
                <p>Confirmez l'installation</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Desktop fallback */}
        {!isIOS && !isAndroid && !deferredPrompt && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Installation sur ordinateur</CardTitle>
              <CardDescription>Utilisez Chrome ou Edge pour installer l'application</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Recherchez l'icône d'installation dans la barre d'adresse de votre navigateur,
                ou utilisez le menu (⋮) puis "Installer EasyFlows Pro".
              </p>
            </CardContent>
          </Card>
        )}

        {/* Back link */}
        <div className="text-center pt-4">
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Install;