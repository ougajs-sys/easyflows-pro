import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Truck, Users, Plus, X } from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  instruction: string;
  icon: string;
}

interface DeliveryPerson {
  id: string;
  user_id: string;
  name: string;
  zone: string | null;
  status: string;
}

interface QuickActionConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: QuickAction | null;
  onConfirm: (instruction: string) => void;
  isProcessing: boolean;
}

export function QuickActionConfigDialog({
  open,
  onOpenChange,
  action,
  onConfirm,
  isProcessing,
}: QuickActionConfigDialogProps) {
  const [instruction, setInstruction] = useState("");
  const [zones, setZones] = useState<string[]>([]);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [newZone, setNewZone] = useState("");
  const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPerson[]>([]);
  const [selectedDeliveryPersons, setSelectedDeliveryPersons] = useState<string[]>([]);
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [balanceByWorkload, setBalanceByWorkload] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Check if this is a delivery distribution action
  const isDeliveryAction = action?.id === "distribute-confirmed-delivery";
  const isCallerAction = action?.id === "distribute-pending" || action?.id === "distribute-confirmed-callers";

  useEffect(() => {
    if (action) {
      setInstruction(action.instruction);
    }
  }, [action]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load zones from delivery persons and clients
      const [deliveryResult, clientsResult, profilesResult] = await Promise.all([
        supabase
          .from("delivery_persons")
          .select("id, user_id, zone, status, is_active")
          .eq("is_active", true),
        supabase
          .from("clients")
          .select("zone")
          .not("zone", "is", null),
        supabase.from("profiles").select("id, full_name"),
      ]);

      // Extract unique zones
      const deliveryZones = (deliveryResult.data || [])
        .map((d) => d.zone)
        .filter((z): z is string => !!z);
      const clientZones = (clientsResult.data || [])
        .map((c) => c.zone)
        .filter((z): z is string => !!z);
      
      const uniqueZones = [...new Set([...deliveryZones, ...clientZones])].sort();
      setZones(uniqueZones);

      // Map delivery persons with names
      const deliveryWithNames = (deliveryResult.data || []).map((d) => ({
        id: d.id,
        user_id: d.user_id,
        name: profilesResult.data?.find((p) => p.id === d.user_id)?.full_name || "Inconnu",
        zone: d.zone,
        status: d.status,
      }));
      setDeliveryPersons(deliveryWithNames);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleZoneToggle = (zone: string) => {
    setSelectedZones((prev) =>
      prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]
    );
  };

  const handleAddZone = () => {
    if (newZone.trim() && !zones.includes(newZone.trim())) {
      setZones((prev) => [...prev, newZone.trim()].sort());
      setSelectedZones((prev) => [...prev, newZone.trim()]);
      setNewZone("");
    }
  };

  const handleDeliveryPersonToggle = (id: string) => {
    setSelectedDeliveryPersons((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const buildInstruction = () => {
    let finalInstruction = instruction;

    if (isDeliveryAction) {
      const parts: string[] = [];
      parts.push("Distribue les commandes confirmées");

      if (selectedZones.length > 0) {
        parts.push(`des zones ${selectedZones.join(", ")}`);
      }

      parts.push("aux livreurs");

      if (selectedDeliveryPersons.length > 0) {
        const selectedNames = deliveryPersons
          .filter((d) => selectedDeliveryPersons.includes(d.id))
          .map((d) => d.name);
        parts.push(`(${selectedNames.join(", ")})`);
      } else if (onlyAvailable) {
        parts.push("disponibles");
      }

      if (balanceByWorkload) {
        parts.push("en équilibrant selon leur charge de travail");
      } else {
        parts.push("de manière équitable");
      }

      finalInstruction = parts.join(" ");
    } else if (isCallerAction && selectedZones.length > 0) {
      finalInstruction = `${instruction} pour les clients des zones: ${selectedZones.join(", ")}`;
    }

    return finalInstruction;
  };

  const handleConfirm = () => {
    const finalInstruction = buildInstruction();
    onConfirm(finalInstruction);
  };

  // Filter delivery persons based on zone selection
  const filteredDeliveryPersons = selectedZones.length > 0
    ? deliveryPersons.filter((d) => d.zone && selectedZones.includes(d.zone))
    : deliveryPersons;

  const availableCount = filteredDeliveryPersons.filter((d) => d.status === "available").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDeliveryAction ? <Truck className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            Configurer l'action
          </DialogTitle>
          <DialogDescription>
            Personnalisez les paramètres avant d'exécuter l'action
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 py-4">
              {/* Instruction preview */}
              <div className="space-y-2">
                <Label>Instruction finale</Label>
                <Textarea
                  value={buildInstruction()}
                  onChange={(e) => setInstruction(e.target.value)}
                  className="min-h-[80px] bg-muted/50"
                  readOnly={isDeliveryAction || (isCallerAction && selectedZones.length > 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Cette instruction sera envoyée à l'Agent IA
                </p>
              </div>

              <Separator />

              {/* Zone Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Filtrer par zones
                  </Label>
                  {selectedZones.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedZones([])}
                      className="h-7 text-xs"
                    >
                      Tout désélectionner
                    </Button>
                  )}
                </div>

                {zones.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {zones.map((zone) => (
                      <Badge
                        key={zone}
                        variant={selectedZones.includes(zone) ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary/80 transition-colors"
                        onClick={() => handleZoneToggle(zone)}
                      >
                        {zone}
                        {selectedZones.includes(zone) && (
                          <X className="w-3 h-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucune zone définie. Ajoutez-en une ci-dessous.
                  </p>
                )}

                {/* Add new zone */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Ajouter une zone..."
                    value={newZone}
                    onChange={(e) => setNewZone(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddZone();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddZone}
                    disabled={!newZone.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Delivery-specific options */}
              {isDeliveryAction && (
                <>
                  <Separator />

                  {/* Options */}
                  <div className="space-y-3">
                    <Label>Options de distribution</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="onlyAvailable"
                          checked={onlyAvailable}
                          onCheckedChange={(checked) => setOnlyAvailable(checked === true)}
                        />
                        <label
                          htmlFor="onlyAvailable"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Uniquement les livreurs disponibles ({availableCount} actuellement)
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="balanceByWorkload"
                          checked={balanceByWorkload}
                          onCheckedChange={(checked) => setBalanceByWorkload(checked === true)}
                        />
                        <label
                          htmlFor="balanceByWorkload"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Équilibrer selon la charge de travail
                        </label>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Delivery person selection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        Sélectionner des livreurs spécifiques (optionnel)
                      </Label>
                      {selectedDeliveryPersons.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDeliveryPersons([])}
                          className="h-7 text-xs"
                        >
                          Tout désélectionner
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {filteredDeliveryPersons.map((person) => (
                        <div
                          key={person.id}
                          onClick={() => handleDeliveryPersonToggle(person.id)}
                          className={`
                            p-3 rounded-lg border cursor-pointer transition-colors
                            ${selectedDeliveryPersons.includes(person.id)
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{person.name}</span>
                            <Badge
                              variant={person.status === "available" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {person.status === "available"
                                ? "Disponible"
                                : person.status === "busy"
                                ? "Occupé"
                                : "Hors ligne"}
                            </Badge>
                          </div>
                          {person.zone && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Zone: {person.zone}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {filteredDeliveryPersons.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucun livreur trouvé pour les zones sélectionnées
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing || isLoading}>
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exécution...
              </>
            ) : (
              "Exécuter l'action"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
