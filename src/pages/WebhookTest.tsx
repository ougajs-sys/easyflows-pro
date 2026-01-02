import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2, ArrowLeft, Copy, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const WEBHOOK_URL = "https://qpxzuglvvfvookzmpgfe.supabase.co/functions/v1/webhook-orders";

export default function WebhookTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; data?: unknown } | null>(null);
  
  const [formData, setFormData] = useState({
    form_name: "",  // Nom du formulaire Elementor = nom du produit
    name: "",
    phone: "",
    address: ""
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const payload = {
        form_name: formData.form_name,  // Le nom du produit est dans le nom du formulaire
        name: formData.name,
        phone: formData.phone,
        address: formData.address
      };

      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: `Commande créée: ${data.order?.order_number || data.order?.id}`,
          data
        });
        toast.success("Commande créée avec succès!");
      } else {
        setResult({
          success: false,
          message: data.error || "Erreur inconnue",
          data
        });
        toast.error(data.error || "Erreur lors de la création");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur réseau";
      setResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié!");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/integrations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Test Webhook Commandes</h1>
            <p className="text-muted-foreground">Formulaire simplifié pour tester l'intégration</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Formulaire de test */}
          <Card>
            <CardHeader>
              <CardTitle>Formulaire de Test</CardTitle>
              <CardDescription>Testez l'envoi d'une commande vers le webhook</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="form_name">Nom du formulaire (= Produit) *</Label>
                  <Input
                    id="form_name"
                    placeholder="Ex: Crème cicatrisante"
                    value={formData.form_name}
                    onChange={(e) => handleChange("form_name", e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Dans Elementor, c'est le nom du formulaire qui contient le nom du produit
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nom du client</Label>
                  <Input
                    id="name"
                    placeholder="Ex: TEST APATAP"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone *</Label>
                  <Input
                    id="phone"
                    placeholder="Ex: 0759767341"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Lieu de livraison</Label>
                  <Input
                    id="address"
                    placeholder="Ex: BINGERVILLE OUGA"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    "Envoyer la commande"
                  )}
                </Button>
              </form>

              {result && (
                <div className={`mt-4 p-4 rounded-lg ${result.success ? "bg-green-500/10 border border-green-500/30" : "bg-destructive/10 border border-destructive/30"}`}>
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <span className={result.success ? "text-green-600" : "text-destructive"}>
                      {result.message}
                    </span>
                  </div>
                  {result.data && (
                    <pre className="mt-2 text-xs overflow-auto max-h-32 p-2 bg-muted rounded">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuration Elementor */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration Elementor</CardTitle>
              <CardDescription>Noms des champs à utiliser dans Elementor Pro</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">URL Webhook</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(WEBHOOK_URL)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <code className="text-xs break-all">{WEBHOOK_URL}</code>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sm">Configuration Elementor:</h4>
                
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg mb-3">
                  <p className="text-sm font-medium mb-1">📝 Nom du formulaire</p>
                  <p className="text-xs text-muted-foreground">
                    Le nom du formulaire Elementor doit être le <strong>nom du produit</strong> (ex: "Crème cicatrisante")
                  </p>
                </div>
                
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Champ Elementor</th>
                      <th className="text-left py-2">ID à utiliser</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="py-2">Nom du client</td>
                      <td className="py-2">
                        <code className="bg-muted px-2 py-1 rounded text-xs">name</code>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2">Téléphone</td>
                      <td className="py-2">
                        <code className="bg-muted px-2 py-1 rounded text-xs">phone</code>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2">Lieu de livraison</td>
                      <td className="py-2">
                        <code className="bg-muted px-2 py-1 rounded text-xs">address</code>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Important:</strong> Dans Elementor, allez dans les paramètres du formulaire → Actions après soumission → Webhook, et collez l'URL ci-dessus.
                </p>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Format ID:</strong> Pour chaque champ du formulaire Elementor, dans "Avancé", mettez l'ID exactement comme indiqué (ex: <code>phone</code>, pas <code>Phone</code>).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
