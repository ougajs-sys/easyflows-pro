import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "@/hooks/useProducts";
import { SmsTestPanel } from "@/components/sms/SmsTestPanel";
import { 
  Copy, 
  Check, 
  Webhook, 
  ArrowRight, 
  ShoppingCart,
  Zap,
  Globe,
  Server,
  CheckCircle2,
  Send,
  TestTube,
  FileJson,
  Loader2,
  ExternalLink,
  Store,
  Smartphone,
  MessageSquare
} from "lucide-react";

const WEBHOOK_URL = "https://qpxzuglvvfvookzmpgfe.supabase.co/functions/v1/webhook-orders";

export default function Integrations() {
  const [copied, setCopied] = useState(false);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const { products } = useProducts();
  
  // Formulaire de test
  const [testForm, setTestForm] = useState({
    client_name: "",
    client_phone: "",
    client_city: "",
    product_id: "",
    product_name: "",
    quantity: "1",
    unit_price: "",
    notes: "",
  });

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

  const handleProductSelect = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    if (product) {
      setTestForm({
        ...testForm,
        product_id: productId,
        product_name: product.name,
        unit_price: product.price.toString(),
      });
    }
  };

  const handleTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testForm.client_phone || !testForm.product_name || !testForm.unit_price) {
      toast.error("Veuillez remplir le téléphone et sélectionner un produit");
      return;
    }

    setIsTestLoading(true);
    setTestResult(null);

    try {
      const payload = {
        client_name: testForm.client_name,
        phone: testForm.client_phone,
        city: testForm.client_city,
        product_name: testForm.product_name,
        quantity: testForm.quantity,
        unit_price: testForm.unit_price,
        total_amount: (parseFloat(testForm.unit_price) * parseInt(testForm.quantity)).toString(),
        notes: testForm.notes,
        order_id: `TEST-${Date.now()}`,
      };

      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({ 
          success: true, 
          message: `Commande créée avec succès ! N° ${data.order?.order_number || "N/A"}` 
        });
        toast.success("Commande de test créée !");
        // Reset form
        setTestForm({
          client_name: "",
          client_phone: "",
          client_city: "",
          product_id: "",
          product_name: "",
          quantity: "1",
          unit_price: "",
          notes: "",
        });
      } else {
        setTestResult({ 
          success: false, 
          message: data.error || "Erreur lors de la création" 
        });
        toast.error(data.error || "Erreur lors de la création");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur de connexion";
      setTestResult({ success: false, message });
      toast.error(message);
    } finally {
      setIsTestLoading(false);
    }
  };

  const jsonExamples = {
    simple: `{
  "client_name": "Jean Dupont",
  "phone": "+225 07 00 00 00",
  "address": "Cocody, Rue des Jardins",
  "city": "Abidjan",
  "product_name": "Produit Example",
  "quantity": "2",
  "unit_price": "12500",
  "notes": "Livraison le matin"
}`,
    woocommerce: `{
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
}`,
  };

  const integrationSources = [
    {
      name: "Envoi Direct",
      icon: Send,
      description: "Envoyez des commandes directement via le formulaire ci-dessous",
      color: "text-green-500",
      bgColor: "bg-green-500/20",
    },
    {
      name: "API / Webhook",
      icon: Webhook,
      description: "Intégrez n'importe quel système via requête HTTP POST",
      color: "text-primary",
      bgColor: "bg-primary/20",
    },
    {
      name: "Zapier / Make",
      icon: Zap,
      description: "Connectez WordPress, Shopify, ou d'autres plateformes",
      color: "text-violet-500",
      bgColor: "bg-violet-500/20",
    },
    {
      name: "Application Mobile",
      icon: Smartphone,
      description: "Recevez des commandes depuis une app mobile",
      color: "text-blue-500",
      bgColor: "bg-blue-500/20",
    },
  ];

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
              <span className="text-gradient">Intégrations</span> & Webhook
            </h1>
            <p className="text-muted-foreground">
              Recevez des commandes depuis n'importe quelle source
            </p>
          </div>
        </div>
      </div>

      {/* Webhook URL Card */}
      <Card className="glass-card mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            <CardTitle>URL du Webhook Universel</CardTitle>
            <Badge variant="outline" className="bg-success/20 text-success border-success/30">
              Actif
            </Badge>
          </div>
          <CardDescription>
            Cette URL accepte les commandes de n'importe quelle source - pas besoin de WordPress ou Make
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

      {/* Sources disponibles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {integrationSources.map((source) => (
          <Card key={source.name} className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${source.bgColor} flex items-center justify-center`}>
                  <source.icon className={`w-5 h-5 ${source.color}`} />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{source.name}</h3>
                  <p className="text-xs text-muted-foreground">{source.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="elementor" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto gap-2 p-2">
          <TabsTrigger value="elementor" className="flex flex-col sm:flex-row items-center gap-2 whitespace-normal text-center leading-tight py-3">
            <Globe className="w-4 h-4 flex-shrink-0" />
            <span>Elementor</span>
          </TabsTrigger>
          <TabsTrigger value="test" className="flex flex-col sm:flex-row items-center gap-2 whitespace-normal text-center leading-tight py-3">
            <TestTube className="w-4 h-4 flex-shrink-0" />
            <span>Test Direct</span>
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex flex-col sm:flex-row items-center gap-2 whitespace-normal text-center leading-tight py-3">
            <MessageSquare className="w-4 h-4 flex-shrink-0" />
            <span>Test SMS</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="flex flex-col sm:flex-row items-center gap-2 whitespace-normal text-center leading-tight py-3">
            <FileJson className="w-4 h-4 flex-shrink-0" />
            <span>Documentation API</span>
          </TabsTrigger>
          <TabsTrigger value="platforms" className="flex flex-col sm:flex-row items-center gap-2 whitespace-normal text-center leading-tight py-3">
            <Zap className="w-4 h-4 flex-shrink-0" />
            <span>Autres</span>
          </TabsTrigger>
        </TabsList>

        {/* Elementor Tab */}
        <TabsContent value="elementor">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#92003B]/20 flex items-center justify-center">
                    <Globe className="w-6 h-6 text-[#92003B]" />
                  </div>
                  <div>
                    <CardTitle>Configuration Elementor Pro Forms</CardTitle>
                    <CardDescription>
                      Connectez votre formulaire Elementor directement à votre système de gestion
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Étape 1 */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-primary">1</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">Créez votre formulaire Elementor</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Ajoutez ces champs dans votre formulaire avec les IDs exacts suivants :
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <div className="p-2 bg-secondary/50 rounded text-xs">
                        <code className="text-primary">client_name</code>
                        <span className="block text-muted-foreground mt-1">Nom du client</span>
                      </div>
                      <div className="p-2 bg-secondary/50 rounded text-xs">
                        <code className="text-primary">phone</code>
                        <span className="block text-muted-foreground mt-1">Téléphone *</span>
                      </div>
                      <div className="p-2 bg-secondary/50 rounded text-xs">
                        <code className="text-primary">city</code>
                        <span className="block text-muted-foreground mt-1">Ville/Commune</span>
                      </div>
                      <div className="p-2 bg-secondary/50 rounded text-xs">
                        <code className="text-primary">product_name</code>
                        <span className="block text-muted-foreground mt-1">Nom produit *</span>
                      </div>
                      <div className="p-2 bg-secondary/50 rounded text-xs">
                        <code className="text-primary">quantity</code>
                        <span className="block text-muted-foreground mt-1">Quantité</span>
                      </div>
                      <div className="p-2 bg-secondary/50 rounded text-xs">
                        <code className="text-primary">unit_price</code>
                        <span className="block text-muted-foreground mt-1">Prix unitaire</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Étape 2 */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-primary">2</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">Configurez l'action Webhook</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Dans les paramètres du formulaire Elementor :
                    </p>
                    <ol className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-medium">a.</span>
                        <span>Allez dans <strong>Actions après soumission</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-medium">b.</span>
                        <span>Cliquez sur <strong>+ Ajouter une action</strong> et sélectionnez <strong>Webhook</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-medium">c.</span>
                        <span>Collez l'URL du webhook dans le champ URL :</span>
                      </li>
                    </ol>
                    <div className="mt-3 flex gap-2">
                      <Input 
                        value={WEBHOOK_URL} 
                        readOnly 
                        className="font-mono text-xs"
                      />
                      <Button onClick={copyToClipboard} variant="outline" size="sm">
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Étape 3 */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-primary">3</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">Configurez les métadonnées avancées</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Dans la section <strong>Webhook</strong> du formulaire :
                    </p>
                    <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span className="text-sm">Activez <strong>Advanced Data</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span className="text-sm">Méthode : <strong>POST</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span className="text-sm">Format : <strong>JSON</strong> (si disponible)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Étape 4 */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">Testez votre formulaire</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Soumettez une commande test depuis votre site WordPress. 
                      Elle apparaîtra instantanément dans votre tableau de bord des commandes.
                    </p>
                    <Link to="/webhook-test">
                      <Button variant="outline" className="gap-2">
                        <TestTube className="w-4 h-4" />
                        Ouvrir le formulaire de test simplifié
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Structure JSON attendue */}
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileJson className="w-5 h-5 text-primary" />
                  <CardTitle>Structure JSON envoyée</CardTitle>
                </div>
                <CardDescription>
                  Voici le format que le webhook recevra
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-secondary/50 p-4 rounded-lg text-xs overflow-x-auto">
                  <code className="text-foreground">{`{
  "client_name": "Jean Dupont",
  "phone": "+225 07 00 00 00",
  "city": "Abidjan",
  "product_name": "Votre Produit",
  "quantity": "2",
  "unit_price": "15000",
  "notes": "Commentaire client"
}`}</code>
                </pre>
              </CardContent>
            </Card>

            {/* Important */}
            <Card className="glass-card border-amber-500/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <CardTitle>Points importants</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                  <p className="text-sm">
                    <strong>Elementor Pro requis</strong> - L'action Webhook n'est disponible que dans la version Pro
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                  <p className="text-sm">
                    <strong>IDs des champs</strong> - Utilisez les IDs exacts (client_name, phone, etc.) pour que les données soient reconnues
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                  <p className="text-sm">
                    <strong>Téléphone obligatoire</strong> - Le champ téléphone est requis pour créer le client
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                  <p className="text-sm">
                    <strong>Produit existant</strong> - Si le nom du produit correspond à un produit existant, il sera lié automatiquement
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Test Direct Tab */}
        <TabsContent value="test">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-green-500" />
                  <CardTitle>Envoyer une commande de test</CardTitle>
                </div>
                <CardDescription>
                  Testez le webhook en créant une commande directement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTestSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="client_name">Nom du client</Label>
                      <Input
                        id="client_name"
                        value={testForm.client_name}
                        onChange={(e) => setTestForm({ ...testForm, client_name: e.target.value })}
                        placeholder="Jean Dupont"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client_phone">Téléphone *</Label>
                      <Input
                        id="client_phone"
                        value={testForm.client_phone}
                        onChange={(e) => setTestForm({ ...testForm, client_phone: e.target.value })}
                        placeholder="+225 07 00 00 00"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="client_city">Ville / Commune</Label>
                    <Input
                      id="client_city"
                      value={testForm.client_city}
                      onChange={(e) => setTestForm({ ...testForm, client_city: e.target.value })}
                      placeholder="Abidjan, Cocody..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Nom du produit *</Label>
                    <Select value={testForm.product_id} onValueChange={handleProductSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un produit" />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.filter(p => p.is_active).map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {product.price.toLocaleString()} FCFA
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantité</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={testForm.quantity}
                        onChange={(e) => setTestForm({ ...testForm, quantity: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit_price">Prix unitaire (FCFA)</Label>
                      <Input
                        id="unit_price"
                        type="number"
                        value={testForm.unit_price}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  {testForm.unit_price && testForm.quantity && (
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total</span>
                        <span className="font-bold text-lg text-primary">
                          {(parseFloat(testForm.unit_price) * parseInt(testForm.quantity)).toLocaleString()} FCFA
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={testForm.notes}
                      onChange={(e) => setTestForm({ ...testForm, notes: e.target.value })}
                      placeholder="Instructions de livraison..."
                      rows={2}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isTestLoading}>
                    {isTestLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Envoyer la commande de test
                  </Button>
                </form>

                {testResult && (
                  <div className={`mt-4 p-4 rounded-lg ${testResult.success ? "bg-success/20 border border-success/30" : "bg-destructive/20 border border-destructive/30"}`}>
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : (
                        <Server className="w-5 h-5 text-destructive" />
                      )}
                      <span className={testResult.success ? "text-success" : "text-destructive"}>
                        {testResult.message}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Résultat et aide */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Comment ça marche ?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Remplissez le formulaire</h4>
                      <p className="text-xs text-muted-foreground">Entrez les informations de la commande</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Envoi au webhook</h4>
                      <p className="text-xs text-muted-foreground">Les données sont envoyées en JSON</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Création automatique</h4>
                      <p className="text-xs text-muted-foreground">Client et commande créés instantanément</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Visible dans Pipeline</h4>
                      <p className="text-xs text-muted-foreground">La commande apparaît dans vos commandes</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-secondary/50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">💡 Astuce</h4>
                  <p className="text-xs text-muted-foreground">
                    Vous pouvez utiliser ce webhook depuis n'importe quel outil : Postman, cURL, 
                    une application mobile, un autre site web, ou même un formulaire Google Forms !
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SMS Test Tab */}
        <TabsContent value="sms">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SmsTestPanel />
            
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Notifications SMS automatiques
                </CardTitle>
                <CardDescription>
                  Configuration des SMS envoyés automatiquement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <span className="font-medium text-success">Messenger360 configuré</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Les SMS sont envoyés automatiquement via Messenger360
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Notifications automatiques :</h4>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Nouvelle commande</p>
                        <p className="text-xs text-muted-foreground">SMS de confirmation envoyé au client</p>
                      </div>
                      <Badge className="bg-success/20 text-success border-success/30">Actif</Badge>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                        <Send className="w-4 h-4 text-violet-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Commande expédiée</p>
                        <p className="text-xs text-muted-foreground">Notification de départ en livraison</p>
                      </div>
                      <Badge variant="outline">Manuel</Badge>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Commande livrée</p>
                        <p className="text-xs text-muted-foreground">Remerciement après livraison</p>
                      </div>
                      <Badge variant="outline">Manuel</Badge>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium text-sm mb-2">📱 Campagnes SMS</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Envoyez des SMS en masse à vos clients depuis la page Campagnes
                  </p>
                  <Link to="/campaigns">
                    <Button variant="outline" size="sm" className="gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Gérer les campagnes
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documentation API Tab */}
        <TabsContent value="api">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileJson className="w-5 h-5 text-primary" />
                  <CardTitle>Format Simple</CardTitle>
                </div>
                <CardDescription>
                  Format le plus simple pour envoyer une commande
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-secondary/50 p-4 rounded-lg text-xs overflow-x-auto">
                  <code className="text-foreground">{jsonExamples.simple}</code>
                </pre>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-500" />
                  <CardTitle>Format WooCommerce</CardTitle>
                </div>
                <CardDescription>
                  Compatible avec les données WooCommerce
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-secondary/50 p-4 rounded-lg text-xs overflow-x-auto">
                  <code className="text-foreground">{jsonExamples.woocommerce}</code>
                </pre>
              </CardContent>
            </Card>

            <Card className="glass-card lg:col-span-2">
              <CardHeader>
                <CardTitle>Champs acceptés</CardTitle>
                <CardDescription>Le webhook accepte plusieurs formats de données</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-sm mb-3">Informations client</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <code className="text-xs bg-secondary/50 px-2 py-1 rounded">client_name</code>
                        <span className="text-muted-foreground">ou billing_first_name + billing_last_name</span>
                      </div>
                      <div className="flex justify-between">
                        <code className="text-xs bg-secondary/50 px-2 py-1 rounded">phone</code>
                        <span className="text-muted-foreground">ou billing_phone, client_phone</span>
                      </div>
                      <div className="flex justify-between">
                        <code className="text-xs bg-secondary/50 px-2 py-1 rounded">address</code>
                        <span className="text-muted-foreground">ou billing_address_1</span>
                      </div>
                      <div className="flex justify-between">
                        <code className="text-xs bg-secondary/50 px-2 py-1 rounded">city</code>
                        <span className="text-muted-foreground">ou billing_city</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-3">Informations commande</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <code className="text-xs bg-secondary/50 px-2 py-1 rounded">product_name</code>
                        <span className="text-muted-foreground">ou line_items[0].name</span>
                      </div>
                      <div className="flex justify-between">
                        <code className="text-xs bg-secondary/50 px-2 py-1 rounded">quantity</code>
                        <span className="text-muted-foreground">ou line_items[0].quantity</span>
                      </div>
                      <div className="flex justify-between">
                        <code className="text-xs bg-secondary/50 px-2 py-1 rounded">unit_price</code>
                        <span className="text-muted-foreground">ou line_items[0].price</span>
                      </div>
                      <div className="flex justify-between">
                        <code className="text-xs bg-secondary/50 px-2 py-1 rounded">total_amount</code>
                        <span className="text-muted-foreground">ou total</span>
                      </div>
                      <div className="flex justify-between">
                        <code className="text-xs bg-secondary/50 px-2 py-1 rounded">notes</code>
                        <span className="text-muted-foreground">ou customer_note</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card lg:col-span-2">
              <CardHeader>
                <CardTitle>Exemple cURL</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-secondary/50 p-4 rounded-lg text-xs overflow-x-auto">
                  <code className="text-foreground">{`curl -X POST "${WEBHOOK_URL}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "client_name": "Jean Dupont",
    "phone": "+225 07 00 00 00",
    "product_name": "Produit Test",
    "quantity": "1",
    "unit_price": "15000"
  }'`}</code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Platforms Tab */}
        <TabsContent value="platforms">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  <CardTitle>WordPress / WooCommerce</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Utilisez un plugin webhook ou connectez via Make/Zapier
                </p>
                <div className="space-y-2">
                  <Badge variant="outline">WooCommerce Webhooks</Badge>
                  <Badge variant="outline">Make Integration</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-green-500" />
                  <CardTitle>Shopify</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configurez un webhook Shopify pour les nouvelles commandes
                </p>
                <div className="space-y-2">
                  <Badge variant="outline">Order Created</Badge>
                  <Badge variant="outline">Zapier</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-violet-500" />
                  <CardTitle>Make / Zapier</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Connectez n'importe quelle app via Make ou Zapier
                </p>
                <div className="space-y-2">
                  <Badge variant="outline">HTTP Module</Badge>
                  <Badge variant="outline">Webhooks</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileJson className="w-5 h-5 text-amber-500" />
                  <CardTitle>Google Forms</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Recevez des commandes via un formulaire Google
                </p>
                <div className="space-y-2">
                  <Badge variant="outline">Apps Script</Badge>
                  <Badge variant="outline">Webhook</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-cyan-500" />
                  <CardTitle>Application Mobile</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Intégrez dans votre app mobile via HTTP POST
                </p>
                <div className="space-y-2">
                  <Badge variant="outline">REST API</Badge>
                  <Badge variant="outline">JSON</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-primary" />
                  <CardTitle>API Custom</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Intégrez depuis n'importe quel système backend
                </p>
                <div className="space-y-2">
                  <Badge variant="outline">POST Request</Badge>
                  <Badge variant="outline">Any Language</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Flow Diagram */}
          <Card className="glass-card mt-6">
            <CardHeader>
              <CardTitle>Flux de synchronisation universel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 px-4 py-3 bg-secondary/50 rounded-xl">
                  <Globe className="w-6 h-6 text-blue-500" />
                  <div>
                    <p className="font-medium text-sm">N'importe quelle source</p>
                    <p className="text-xs text-muted-foreground">WP, Shopify, App, API...</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
                <div className="flex items-center gap-2 px-4 py-3 bg-secondary/50 rounded-xl">
                  <Webhook className="w-6 h-6 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Webhook</p>
                    <p className="text-xs text-muted-foreground">POST JSON</p>
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
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
