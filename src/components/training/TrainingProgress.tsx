import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, BookOpen, Clock, CheckCircle2 } from "lucide-react";

const stats = [
  {
    label: "Modules complétés",
    value: "3/8",
    icon: CheckCircle2,
    color: "text-success",
    bgColor: "bg-success/20",
  },
  {
    label: "Progression globale",
    value: "38%",
    icon: Trophy,
    color: "text-amber-500",
    bgColor: "bg-amber-500/20",
  },
  {
    label: "Temps d'apprentissage",
    value: "2h 45m",
    icon: Clock,
    color: "text-primary",
    bgColor: "bg-primary/20",
  },
  {
    label: "Vidéos visionnées",
    value: "12/32",
    icon: BookOpen,
    color: "text-accent-foreground",
    bgColor: "bg-accent/50",
  },
];

export function TrainingProgress() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      
      {/* Progress Bar */}
      <div className="col-span-full">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progression totale</span>
              <span className="text-sm text-muted-foreground">38%</span>
            </div>
            <Progress value={38} className="h-2" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
