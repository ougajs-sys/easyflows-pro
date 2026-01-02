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
    name: "",
    phone: "",
    address: "",
    product_name: "",
    unit_price: "",
    quantity: "1",
    notes: ""
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
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        product_name: formData.product_name,
        unit_price: parseFloat(formData.unit_price) || 0,
        quantity: parseInt(formData.quantity) || 1,
        notes: formData.notes
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
                  <Label htmlFor="name">Nom du client</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Jean Dupont"
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
                    placeholder="Ex: Bingerville, Abidjan"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product_name">Produit commandé *</Label>
                  <Input
                    id="product_name"
                    placeholder="Ex: Crème cicatrisante"
                    value={formData.product_name}
                    onChange={(e) => handleChange("product_name", e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit_price">Prix unitaire</Label>
                    <Input
                      id="unit_price"
                      type="number"
                      placeholder="7500"
                      value={formData.unit_price}
                      onChange={(e) => handleChange("unit_price", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantité</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => handleChange("quantity", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Notes optionnelles"
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
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
                <h4 className="font-medium text-sm">Mapping des champs Elementor:</h4>
                
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Champ Elementor</th>
                      <th className="text-left py-2">ID à utiliser</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="py-2">Nom</td>
                      <td className="py-2">
                        <code className="bg-muted px-2 py-1 rounded text-xs">name</code>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2">Votre Contact</td>
                      <td className="py-2">
                        <code className="bg-muted px-2 py-1 rounded text-xs">phone</code>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2">Lieu de Livraison</td>
                      <td className="py-2">
                        <code className="bg-muted px-2 py-1 rounded text-xs">address</code>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2">Produit Commandé</td>
                      <td className="py-2">
                        <code className="bg-muted px-2 py-1 rounded text-xs">product_name</code>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2">Prix unitaire</td>
                      <td className="py-2">
                        <code className="bg-muted px-2 py-1 rounded text-xs">unit_price</code>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2">Quantité</td>
                      <td className="py-2">
                        <code className="bg-muted px-2 py-1 rounded text-xs">quantity</code>
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
