import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Settings2 } from "lucide-react";
import {
  Users,
  Truck,
  Phone,
  Package,
  CreditCard,
  AlertTriangle,
  Star,
  Sparkles,
  Send,
  TrendingUp,
  BarChart3,
  Calendar,
  UserCheck,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  instruction: string;
  icon: string;
}

export interface ActionCategory {
  id: string;
  label: string;
  icon: string;
  color: "primary" | "blue" | "accent" | "success";
  actions: QuickAction[];
}

interface AIQuickActionsProps {
  categories: ActionCategory[];
  onActionClick: (action: QuickAction) => void;
  isProcessing: boolean;
  configurableActionIds: string[];
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  Truck,
  Phone,
  Package,
  CreditCard,
  AlertTriangle,
  Star,
  Sparkles,
  Send,
  TrendingUp,
  BarChart3,
  Calendar,
  UserCheck,
  Target,
};

const colorStyles = {
  primary: {
    bg: "bg-primary/10",
    border: "border-primary/30",
    icon: "text-primary",
    hover: "hover:border-primary/50 hover:bg-primary/15",
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    icon: "text-blue-500",
    hover: "hover:border-blue-500/50 hover:bg-blue-500/15",
  },
  accent: {
    bg: "bg-accent/10",
    border: "border-accent/30",
    icon: "text-accent",
    hover: "hover:border-accent/50 hover:bg-accent/15",
  },
  success: {
    bg: "bg-success/10",
    border: "border-success/30",
    icon: "text-success",
    hover: "hover:border-success/50 hover:bg-success/15",
  },
};

export function AIQuickActions({
  categories,
  onActionClick,
  isProcessing,
  configurableActionIds,
}: AIQuickActionsProps) {
  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const CategoryIcon = iconMap[category.icon] || Package;
        const styles = colorStyles[category.color];

        return (
          <Card key={category.id} className={cn("border", styles.border)}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", styles.bg)}>
                  <CategoryIcon className={cn("w-4 h-4", styles.icon)} />
                </div>
                <span>{category.label}</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {category.actions.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {category.actions.map((action) => {
                  const ActionIcon = iconMap[action.icon] || Package;
                  const isConfigurable = configurableActionIds.includes(action.id);

                  return (
                    <button
                      key={action.id}
                      onClick={() => !isProcessing && onActionClick(action)}
                      disabled={isProcessing}
                      className={cn(
                        "group flex flex-col items-start gap-2 p-4 rounded-xl border transition-all text-left",
                        "bg-card",
                        styles.hover,
                        isProcessing && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", styles.bg)}>
                          <ActionIcon className={cn("w-5 h-5", styles.icon)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="font-medium text-sm truncate">
                              {action.label}
                            </p>
                            {isConfigurable && (
                              <Settings2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {action.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {isProcessing && (
        <div className="fixed bottom-4 right-4 bg-card border rounded-lg shadow-lg p-4 flex items-center gap-3 z-50">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm font-medium">Action en cours...</span>
        </div>
      )}
    </div>
  );
}
