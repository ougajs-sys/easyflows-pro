import { useState } from "react";
import { Calendar, Clock, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ReportOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (scheduledAt: Date, reason: string) => void;
  isLoading?: boolean;
  orderNumber?: string;
}

const quickDateOptions = [
  { label: "Demain", days: 1 },
  { label: "Dans 2 jours", days: 2 },
  { label: "Dans 3 jours", days: 3 },
  { label: "Dans 1 semaine", days: 7 },
];

export function ReportOrderDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  orderNumber,
}: ReportOrderDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [selectedTime, setSelectedTime] = useState("10:00");
  const [reason, setReason] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleConfirm = () => {
    if (!selectedDate) return;
    
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(hours, minutes, 0, 0);
    
    onConfirm(scheduledAt, reason);
    
    // Reset form
    setSelectedDate(addDays(new Date(), 1));
    setSelectedTime("10:00");
    setReason("");
  };

  const handleQuickSelect = (days: number) => {
    setSelectedDate(addDays(new Date(), days));
  };

  const timeOptions = [
    "08:00", "09:00", "10:00", "11:00", "12:00",
    "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-warning" />
            Reporter la livraison
          </DialogTitle>
          <DialogDescription>
            {orderNumber 
              ? `Reporter la commande ${orderNumber} à une date ultérieure.`
              : "Sélectionnez la nouvelle date de livraison souhaitée par le client."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick date selection */}
          <div className="space-y-2">
            <Label>Date rapide</Label>
            <div className="flex flex-wrap gap-2">
              {quickDateOptions.map((option) => (
                <Button
                  key={option.days}
                  type="button"
                  variant={selectedDate && 
                    format(selectedDate, "yyyy-MM-dd") === format(addDays(new Date(), option.days), "yyyy-MM-dd") 
                      ? "default" 
                      : "outline"
                  }
                  size="sm"
                  onClick={() => handleQuickSelect(option.days)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Calendar picker */}
          <div className="space-y-2">
            <Label>Ou choisir une date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })
                  ) : (
                    "Sélectionner une date"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setCalendarOpen(false);
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  locale={fr}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time picker */}
          <div className="space-y-2">
            <Label>Heure préférée</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner l'heure" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Raison du report (optionnel)
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Client absent, pas d'argent, mauvaise adresse..."
              rows={3}
            />
          </div>

          {/* Summary */}
          {selectedDate && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground">Nouvelle livraison prévue:</p>
              <p className="font-medium text-foreground">
                {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })} à {selectedTime}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedDate || isLoading}
            className="bg-warning hover:bg-warning/90 text-warning-foreground"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Clock className="w-4 h-4 mr-2" />
            )}
            Confirmer le report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
