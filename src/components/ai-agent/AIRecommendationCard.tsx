import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info, CheckCircle2, Loader2 } from "lucide-react";

export interface Recommendation {
  id: string;
  type: "urgent" | "warning" | "info" | "success";
  title: string;
  description: string;
  actionLabel?: string;
  instruction?: string;
}

interface AIRecommendationCardProps {
  recommendation: Recommendation;
  onAction?: (instruction: string) => void;
  isProcessing?: boolean;
}

export function AIRecommendationCard({
  recommendation,
  onAction,
  isProcessing,
}: AIRecommendationCardProps) {
  const typeStyles = {
    urgent: {
      bg: "bg-destructive/10 border-destructive/30",
      icon: AlertTriangle,
      iconColor: "text-destructive",
    },
    warning: {
      bg: "bg-warning/10 border-warning/30",
      icon: AlertTriangle,
      iconColor: "text-warning",
    },
    info: {
      bg: "bg-primary/10 border-primary/30",
      icon: Info,
      iconColor: "text-primary",
    },
    success: {
      bg: "bg-success/10 border-success/30",
      icon: CheckCircle2,
      iconColor: "text-success",
    },
  };

  const style = typeStyles[recommendation.type];
  const Icon = style.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border transition-colors",
        style.bg
      )}
    >
      <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", style.iconColor)} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{recommendation.title}</p>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {recommendation.description}
        </p>
      </div>
      {recommendation.actionLabel && recommendation.instruction && onAction && (
        <Button
          size="sm"
          variant="secondary"
          className="shrink-0"
          onClick={() => onAction(recommendation.instruction!)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            recommendation.actionLabel
          )}
        </Button>
      )}
    </div>
  );
}
