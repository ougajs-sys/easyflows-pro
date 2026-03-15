import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SmsTemplatesManager } from "@/components/campaigns/SmsTemplatesManager";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { Send, FileText, CheckCircle, XCircle, Loader2, Phone } from "lucide-react";

const VALID_CI_PREFIXES = ["01", "05", "07", "21", "22", "23", "24", "25", "27"];

function parsePhones(raw: string): string[] {
  return raw
    .split(/[\s,;\n\r\t]+/)
    .map(p => p.trim().replace(/[^0-9+]/g, ""))
    .filter(p => p.length >= 8);
}

function looksIvorian(phone: string): boolean {
  const cleaned = phone.replace(/^\+/, "").replace(/^00/, "");
  if (/^0\d{9}$/.test(cleaned)) {
    return VALID_CI_PREFIXES.includes(cleaned.substring(1, 3));
  }
  if (cleaned.startsWith("225") && cleaned.length === 13) {
    return VALID_CI_PREFIXES.includes(cleaned.substring(3, 5));
  }
  return false;
}

export const QuickSendPanel = () => {
  const [phonesRaw, setPhonesRaw] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"sms" | "whatsapp">("whatsapp");
  const [showTemplates, setShowTemplates] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);
  const { toast } = useToast();

  const phones = parsePhones(phonesRaw);
  const ciCount = phones.filter(looksIvorian).length;
  const nonCiCount = phones.length - ciCount;

  const handleSend = async () => {
    if (phones.length === 0) {
      toast({ title: "Erreur", description: "Aucun numéro détecté", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Erreur", description: "Veuillez saisir un message", variant: "destructive" });
      return;
    }

    setSending(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: { phones, message, type },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult({ sent: data.sent || 0, failed: data.failed || 0, errors: data.errors || [] });
      toast({
        title: "Envoi terminé",
        description: `${data.sent || 0} envoyé(s), ${data.failed || 0} échoué(s)`,
      });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Envoi rapide — Coller les numéros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Phone numbers */}
          <div className="space-y-2">
            <Label>Numéros de téléphone</Label>
            <Textarea
              placeholder={"+2250102030405\n+2250506070809\n0708091011\n..."}
              rows={6}
              value={phonesRaw}
              onChange={(e) => { setPhonesRaw(e.target.value); setResult(null); }}
              className="font-mono text-sm"
            />
            <div className="flex flex-wrap gap-2 items-center">
              {phones.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Phone className="h-3 w-3" />
                  {phones.length} numéro{phones.length > 1 ? "s" : ""} détecté{phones.length > 1 ? "s" : ""}
                </Badge>
              )}
              {ciCount > 0 && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {ciCount} CI
                </Badge>
              )}
              {nonCiCount > 0 && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  ⚠ {nonCiCount} non-CI
                </Badge>
              )}
            </div>
          </div>

          {/* Channel */}
          <div className="space-y-2">
            <Label>Canal</Label>
            <Select value={type} onValueChange={(v: "sms" | "whatsapp") => setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Message</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplates(!showTemplates)}
                className="text-primary gap-1"
              >
                <FileText className="h-3 w-3" />
                {showTemplates ? "Masquer" : "Templates"}
              </Button>
            </div>
            {showTemplates && (
              <div className="border border-border rounded-lg p-3 bg-muted/20">
                <SmsTemplatesManager
                  mode="select"
                  onSelectTemplate={(template) => {
                    setMessage(template.message);
                    setShowTemplates(false);
                  }}
                />
              </div>
            )}
            <Textarea
              placeholder="Rédigez votre message ici..."
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{message.length}/1600 caractères</p>
          </div>

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={sending || phones.length === 0 || !message.trim()}
            className="w-full gap-2"
            size="lg"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Envoi en cours... ({phones.length} destinataires)
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Envoyer à {phones.length} numéro{phones.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>

          {/* Results */}
          {result && (
            <Card className="border-border">
              <CardContent className="p-4 space-y-2">
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-semibold">{result.sent}</span> envoyé{result.sent !== 1 ? "s" : ""}
                  </div>
                  <div className="flex items-center gap-2 text-red-400">
                    <XCircle className="h-4 w-4" />
                    <span className="font-semibold">{result.failed}</span> échoué{result.failed !== 1 ? "s" : ""}
                  </div>
                </div>
                {result.errors.length > 0 && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer">Voir les erreurs ({result.errors.length})</summary>
                    <ul className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                      {result.errors.map((e, i) => (
                        <li key={i} className="font-mono">{e}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
