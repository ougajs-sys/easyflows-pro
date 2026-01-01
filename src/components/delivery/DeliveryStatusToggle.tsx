import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";

type DeliveryStatus = Database["public"]["Enums"]["delivery_status"];

interface DeliveryStatusToggleProps {
  currentStatus: DeliveryStatus;
  onStatusChange: (status: DeliveryStatus) => void;
  isUpdating: boolean;
}

const statuses: { value: DeliveryStatus; label: string; color: string }[] = [
  { value: "available", label: "Disponible", color: "bg-success hover:bg-success/90" },
  { value: "busy", label: "Occupé", color: "bg-warning hover:bg-warning/90" },
  { value: "offline", label: "Hors ligne", color: "bg-muted hover:bg-muted/90" },
];

export function DeliveryStatusToggle({ currentStatus, onStatusChange, isUpdating }: DeliveryStatusToggleProps) {
  return (
    <div className="flex items-center gap-2 p-1 rounded-lg bg-muted/50">
      {statuses.map((status) => (
        <Button
          key={status.value}
          variant="ghost"
          size="sm"
          disabled={isUpdating}
          onClick={() => onStatusChange(status.value)}
          className={cn(
            "flex-1 transition-all",
            currentStatus === status.value
              ? cn(status.color, "text-white shadow-sm")
              : "text-muted-foreground"
          )}
        >
          {status.label}
        </Button>
      ))}
    </div>
  );
}
