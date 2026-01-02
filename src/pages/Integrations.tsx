import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Copy, 
  Check, 
  Webhook, 
  ArrowRight, 
  ShoppingCart,
  Zap,
  Globe,
  Server,
  CheckCircle2
} from "lucide-react";

const WEBHOOK_URL = "https://qpxzuglvvfvookzmpgfe.supabase.co/functions/v1/webhook-orders";

export default function Integrations() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(WEBHOOK_URL);
      setCopied(true);
      toast.success("URL copiée dans le presse-papiers");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erreur lors de la copie");
    }
  };

  const steps = [
    {
      number: 1,
      title: "Configurer le trigger dans Make",
      description: "Dans Make (Integromat), créez un nouveau scénario et ajoutez le module WordPress/WooCommerce comme trigger. Sélectionnez 'Watch Orders' ou 'New Order'.",
    },
    {
      number: 2,
      title: "Ajouter un module HTTP",
      description: "Ajoutez un module 'HTTP - Make a request' après le trigger WordPress.",
    },
    {
      number: 3,
      title: "Configurer la requête HTTP",
      description: "Configurez le module HTTP avec l'URL du webhook ci-dessus, méthode POST, et Content-Type: application/json.",
    },
    {
      number: 4,
      title: "Mapper les données",
      description: "Mappez les champs de la commande WordPress vers le body JSON (voir format ci-dessous).",
    },
    {
      number: 5,
      title: "Activer le scénario",
      description: "Activez votre scénario Make. Les commandes WordPress seront automatiquement synchronisées !",
    },
  ];

  const jsonExample = `{
  "billing_first_name": "Jean",
  "billing_last_name": "Dupont",
  "billing_phone": "+225 07 00 00 00",
  "billing_address_1": "Cocody, Rue des Jardins",
  "billing_city": "Abidjan",
  "total": "25000",
  "line_items": [{
    "name": "Produit Example",
    "quantity": 2,
    "price": "12500"
  }],
  "customer_note": "Livraison le matin SVP",
  "id": "WC-12345"
}`;

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Webhook className="w-6 h-6 text-violet-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">
              <span className="text-gradient">Intégrations</span> WordPress
            </h1>
            <p className="text-muted-foreground">
              Connectez votre boutique WordPress/WooCommerce via Make
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Webhook URL Card */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              <CardTitle>URL du Webhook</CardTitle>
              <Badge variant="outline" className="bg-success/20 text-success border-success/30">
                Actif
              </Badge>
            </div>
            <CardDescription>
              Utilisez cette URL dans Make pour envoyer les commandes WordPress vers Pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input 
                value={WEBHOOK_URL} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button onClick={copyToClipboard} variant="outline" className="shrink-0">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copié" : "Copier"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Steps Card */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <CardTitle>Configuration Make (Integromat)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {steps.map((step) => (
                <div key={step.number} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{step.number}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{step.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* JSON Format Card */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <CardTitle>Format JSON attendu</CardTitle>
            </div>
            <CardDescription>
              Exemple de données à envoyer depuis Make
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-secondary/50 p-4 rounded-lg text-xs overflow-x-auto">
              <code className="text-foreground">{jsonExample}</code>
            </pre>
          </CardContent>
        </Card>

        {/* Flow Diagram */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Flux de synchronisation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-3 bg-secondary/50 rounded-xl">
                <Globe className="w-6 h-6 text-blue-500" />
                <div>
                  <p className="font-medium text-sm">WordPress</p>
                  <p className="text-xs text-muted-foreground">WooCommerce</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
              <div className="flex items-center gap-2 px-4 py-3 bg-secondary/50 rounded-xl">
                <Zap className="w-6 h-6 text-violet-500" />
                <div>
                  <p className="font-medium text-sm">Make</p>
                  <p className="text-xs text-muted-foreground">Integromat</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
              <div className="flex items-center gap-2 px-4 py-3 bg-secondary/50 rounded-xl">
                <Webhook className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-medium text-sm">Webhook</p>
                  <p className="text-xs text-muted-foreground">Supabase</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
              <div className="flex items-center gap-2 px-4 py-3 bg-primary/20 rounded-xl border border-primary/30">
                <CheckCircle2 className="w-6 h-6 text-success" />
                <div>
                  <p className="font-medium text-sm">Pipeline</p>
                  <p className="text-xs text-muted-foreground">Commandes</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
