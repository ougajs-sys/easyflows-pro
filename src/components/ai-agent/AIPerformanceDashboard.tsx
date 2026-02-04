import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AIScoreCircle } from "./AIScoreCircle";
import { AIRecommendationCard, Recommendation } from "./AIRecommendationCard";
import {
  Truck,
  Phone,
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Calendar,
  Users,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformanceMetric {
  label: string;
  value: string;
  trend?: "up" | "down" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
}

interface AIPerformanceDashboardProps {
  score: number;
  scoreDelta?: number;
  metrics: PerformanceMetric[];
  recommendations: Recommendation[];
  onActionClick: (instruction: string) => void;
  onQuickAction: (actionId: string) => void;
  isProcessing: boolean;
  isLoading?: boolean;
}

const quickPerformanceActions = [
  { id: "global-diagnostic", label: "Diagnostic complet", icon: BarChart3 },
  { id: "daily-plan", label: "Plan du jour", icon: Calendar },
  { id: "team-coaching", label: "Coaching équipe", icon: Users },
];

export function AIPerformanceDashboard({
  score,
  scoreDelta,
  metrics,
  recommendations,
  onActionClick,
  onQuickAction,
  isProcessing,
  isLoading,
}: AIPerformanceDashboardProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Analyse en cours...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Score Circle */}
            <div className="flex flex-col items-center">
              <p className="text-sm text-muted-foreground mb-2">Score Boutique</p>
              <AIScoreCircle score={score} size="lg" />
              {scoreDelta !== undefined && scoreDelta !== 0 && (
                <div className={cn(
                  "flex items-center gap-1 mt-2 text-sm font-medium",
                  scoreDelta > 0 ? "text-success" : "text-destructive"
                )}>
                  {scoreDelta > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{scoreDelta > 0 ? "+" : ""}{scoreDelta} vs hier</span>
                </div>
              )}
            </div>

            {/* Metrics */}
            <div className="flex-1 w-full">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {metrics.map((metric, index) => {
                  const Icon = metric.icon;
                  return (
                    <div
                      key={index}
                      className="flex flex-col items-center p-4 rounded-lg bg-muted/50"
                    >
                      <Icon className="w-5 h-5 text-muted-foreground mb-2" />
                      <span className="text-lg font-bold">{metric.value}</span>
                      <span className="text-xs text-muted-foreground text-center">
                        {metric.label}
                      </span>
                      {metric.trend && (
                        <div className={cn(
                          "mt-1",
                          metric.trend === "up" && "text-success",
                          metric.trend === "down" && "text-destructive",
                          metric.trend === "neutral" && "text-muted-foreground"
                        )}>
                          {metric.trend === "up" && <TrendingUp className="w-3 h-3" />}
                          {metric.trend === "down" && <TrendingDown className="w-3 h-3" />}
                          {metric.trend === "neutral" && <Minus className="w-3 h-3" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations Section */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Ce qu'il faut faire aujourd'hui
              <Badge variant="secondary">{recommendations.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((rec) => (
              <AIRecommendationCard
                key={rec.id}
                recommendation={rec}
                onAction={onActionClick}
                isProcessing={isProcessing}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Performance Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {quickPerformanceActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  className="gap-2"
                  onClick={() => onQuickAction(action.id)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  {action.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
