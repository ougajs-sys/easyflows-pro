import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  GraduationCap, 
  PlayCircle, 
  FileText, 
  CheckCircle2, 
  Clock, 
  BookOpen,
  Target,
  Phone,
  MessageSquare,
  Headphones,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  type: "video" | "document" | "quiz";
  category: string;
  completed: boolean;
  icon: typeof PlayCircle;
}

const trainingModules: TrainingModule[] = [
  {
    id: "1",
    title: "Techniques d'appel efficaces",
    description: "Apprenez les meilleures pratiques pour convertir les prospects en clients confirmés.",
    duration: "15 min",
    type: "video",
    category: "Appels",
    completed: true,
    icon: Phone,
  },
  {
    id: "2",
    title: "Scripts de vente",
    description: "Maîtrisez les scripts de vente adaptés à chaque type de client.",
    duration: "10 min",
    type: "document",
    category: "Appels",
    completed: true,
    icon: MessageSquare,
  },
  {
    id: "3",
    title: "Gestion des objections",
    description: "Techniques pour répondre aux objections courantes des clients.",
    duration: "20 min",
    type: "video",
    category: "Appels",
    completed: false,
    icon: Headphones,
  },
  {
    id: "4",
    title: "Utilisation de la plateforme",
    description: "Guide complet pour maîtriser toutes les fonctionnalités de l'outil.",
    duration: "25 min",
    type: "video",
    category: "Plateforme",
    completed: false,
    icon: Target,
  },
  {
    id: "5",
    title: "Processus de confirmation",
    description: "Étapes détaillées pour confirmer une commande correctement.",
    duration: "8 min",
    type: "document",
    category: "Processus",
    completed: false,
    icon: CheckCircle2,
  },
  {
    id: "6",
    title: "Quiz - Techniques d'appel",
    description: "Testez vos connaissances sur les techniques d'appel.",
    duration: "10 min",
    type: "quiz",
    category: "Évaluation",
    completed: false,
    icon: Award,
  },
];

export function CallerTraining() {
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<string>>(
    new Set(trainingModules.filter((m) => m.completed).map((m) => m.id))
  );

  const progress = Math.round((completedModules.size / trainingModules.length) * 100);

  const handleCompleteModule = (moduleId: string) => {
    setCompletedModules((prev) => new Set([...prev, moduleId]));
    setSelectedModule(null);
  };

  const categories = [...new Set(trainingModules.map((m) => m.category))];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <PlayCircle className="w-4 h-4" />;
      case "document":
        return <FileText className="w-4 h-4" />;
      case "quiz":
        return <Award className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "video":
        return <Badge className="bg-primary/15 text-primary">Vidéo</Badge>;
      case "document":
        return <Badge className="bg-blue-500/15 text-blue-500">Document</Badge>;
      case "quiz":
        return <Badge className="bg-warning/15 text-warning">Quiz</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Formation</h1>
        <p className="text-muted-foreground">Ressources pour maîtriser votre rôle d'appelant</p>
      </div>

      {/* Progress Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Progression globale</h3>
                <p className="text-sm text-muted-foreground">
                  {completedModules.size} / {trainingModules.length} modules complétés
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">{progress}%</p>
            </div>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {/* Modules by Category */}
      <Tabs defaultValue={categories[0]}>
        <TabsList className="w-full flex-wrap h-auto gap-1">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category} className="flex-1 min-w-[100px]">
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="mt-4">
            <div className="grid gap-3">
              {trainingModules
                .filter((m) => m.category === category)
                .map((module) => {
                  const isCompleted = completedModules.has(module.id);
                  const ModuleIcon = module.icon;

                  return (
                    <Card 
                      key={module.id}
                      className={cn(
                        "cursor-pointer hover:border-primary/30 transition-colors",
                        isCompleted && "bg-success/5 border-success/30"
                      )}
                      onClick={() => setSelectedModule(module)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "p-3 rounded-lg",
                            isCompleted ? "bg-success/10" : "bg-secondary"
                          )}>
                            <ModuleIcon className={cn(
                              "w-6 h-6",
                              isCompleted ? "text-success" : "text-muted-foreground"
                            )} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-1">
                              <h4 className="font-medium">{module.title}</h4>
                              {isCompleted && (
                                <CheckCircle2 className="w-5 h-5 text-success" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {module.description}
                            </p>
                            <div className="flex items-center gap-3">
                              {getTypeBadge(module.type)}
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {module.duration}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Module Detail Dialog */}
      <Dialog open={!!selectedModule} onOpenChange={() => setSelectedModule(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedModule && getTypeIcon(selectedModule.type)}
              {selectedModule?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedModule && (
            <div className="space-y-4">
              <p className="text-muted-foreground">{selectedModule.description}</p>

              <div className="flex items-center gap-4 text-sm">
                {getTypeBadge(selectedModule.type)}
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {selectedModule.duration}
                </span>
              </div>

              {/* Content Placeholder */}
              <div className="aspect-video bg-secondary/30 rounded-lg flex items-center justify-center">
                {selectedModule.type === "video" ? (
                  <div className="text-center">
                    <PlayCircle className="w-16 h-16 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Contenu vidéo</p>
                  </div>
                ) : selectedModule.type === "document" ? (
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Document PDF</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Award className="w-16 h-16 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Quiz interactif</p>
                  </div>
                )}
              </div>

              {completedModules.has(selectedModule.id) ? (
                <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-success/10 text-success">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Module complété</span>
                </div>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={() => handleCompleteModule(selectedModule.id)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Marquer comme terminé
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
