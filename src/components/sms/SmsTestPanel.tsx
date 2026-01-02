import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Send, MessageSquare, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type NotificationType = 'order_created' | 'order_confirmed' | 'order_shipped' | 'order_delivered' | 'payment_received' | 'custom';

interface TestResult {
  success: boolean;
  message: string;
  details?: unknown;
}

export function SmsTestPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [phone, setPhone] = useState("");
  const [notificationType, setNotificationType] = useState<NotificationType>("order_created");
  const [customMessage, setCustomMessage] = useState("");
  const [channel, setChannel] = useState<'sms' | 'whatsapp'>('sms');

  const handleSendTest = async () => {
    if (!phone) {
      toast.error("Veuillez entrer un numéro de téléphone");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      if (notificationType === 'custom') {
        // Send custom message via send-sms function
        const { data, error } = await supabase.functions.invoke('send-sms', {
          body: {
            phones: [phone],
            message: customMessage,
            type: channel
          }
        });

        if (error) throw error;

        if (data?.sent > 0) {
          setResult({
            success: true,
            message: `SMS envoyé avec succès à ${phone}`,
            details: data
          });
          toast.success("SMS envoyé!");
        } else {
          setResult({
            success: false,
            message: data?.errors?.[0] || "Échec de l'envoi",
            details: data
          });
          toast.error("Échec de l'envoi du SMS");
        }
      } else {
        // Send notification via send-notification-sms function
        const { data, error } = await supabase.functions.invoke('send-notification-sms', {
          body: {
            phone,
            type: notificationType,
            channel,
            data: {
              order_number: "CMD-TEST-001",
              client_name: "Client Test",
              product_name: "Produit Test",
              amount: 15000,
              delivery_address: "Adresse de test"
            }
          }
        });

        if (error) throw error;

        if (data?.sent) {
          setResult({
            success: true,
            message: `Notification "${notificationType}" envoyée à ${phone}`,
            details: data
          });
          toast.success("Notification envoyée!");
        } else {
          setResult({
            success: false,
            message: data?.error || "Échec de l'envoi",
            details: data
          });
          toast.error("Échec de l'envoi");
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur inconnue";
      setResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Test d'envoi SMS/WhatsApp
        </CardTitle>
        <CardDescription>
          Testez l'envoi de SMS et notifications via Messenger360
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Numéro de téléphone</Label>
            <Input
              id="phone"
              placeholder="+212 6XX XXX XXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Canal</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as 'sms' | 'whatsapp')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Type de notification</Label>
          <Select value={notificationType} onValueChange={(v) => setNotificationType(v as NotificationType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="order_created">Commande créée</SelectItem>
              <SelectItem value="order_confirmed">Commande confirmée</SelectItem>
              <SelectItem value="order_shipped">Commande expédiée</SelectItem>
              <SelectItem value="order_delivered">Commande livrée</SelectItem>
              <SelectItem value="payment_received">Paiement reçu</SelectItem>
              <SelectItem value="custom">Message personnalisé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {notificationType === 'custom' && (
          <div className="space-y-2">
            <Label htmlFor="customMessage">Message personnalisé</Label>
            <Textarea
              id="customMessage"
              placeholder="Votre message..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {customMessage.length}/160 caractères (1 SMS)
            </p>
          </div>
        )}

        <Button onClick={handleSendTest} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Envoyer le test
            </>
          )}
        </Button>

        {result && (
          <div className={`p-4 rounded-lg ${result.success ? "bg-green-500/10 border border-green-500/30" : "bg-destructive/10 border border-destructive/30"}`}>
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <span className={result.success ? "text-green-600 dark:text-green-400" : "text-destructive"}>
                {result.message}
              </span>
            </div>
            {result.details && (
              <pre className="mt-2 text-xs overflow-auto max-h-32 p-2 bg-muted rounded">
                {JSON.stringify(result.details, null, 2)}
              </pre>
            )}
          </div>
        )}

        <div className="p-3 bg-muted rounded-lg text-sm">
          <p className="font-medium mb-2">Templates de notification:</p>
          <ul className="space-y-1 text-muted-foreground text-xs">
            <li><strong>order_created:</strong> Confirmation de commande enregistrée</li>
            <li><strong>order_confirmed:</strong> Commande confirmée avec montant</li>
            <li><strong>order_shipped:</strong> Commande en cours de livraison</li>
            <li><strong>order_delivered:</strong> Commande livrée</li>
            <li><strong>payment_received:</strong> Confirmation de paiement</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
