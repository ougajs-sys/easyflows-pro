import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  Phone,
  MessageSquare,
  Headphones,
  Award,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TrainingStepContent } from "./training/TrainingStepContent";
import { QuizContent } from "./training/QuizContent";
import { ChecklistContent } from "./training/ChecklistContent";
import {
  techniquesAppelSteps,
  scriptsVenteSteps,
  gestionObjectionsSteps,
  plateformeSteps,
  confirmationChecklist,
  quizQuestions,
} from "./training/trainingData";

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  type: "video" | "document" | "quiz";
  category: string;
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
    icon: Phone,
  },
  {
    id: "2",
    title: "Scripts de vente",
    description: "Maîtrisez les scripts de vente adaptés à chaque type de client.",
    duration: "10 min",
    type: "document",
    category: "Appels",
    icon: MessageSquare,
  },
  {
    id: "3",
    title: "Gestion des objections",
    description: "Techniques pour répondre aux objections courantes des clients.",
    duration: "20 min",
    type: "video",
    category: "Appels",
    icon: Headphones,
  },
  {
    id: "4",
    title: "Utilisation de la plateforme",
    description: "Guide complet pour maîtriser toutes les fonctionnalités de l'outil.",
    duration: "25 min",
    type: "video",
    category: "Plateforme",
    icon: Target,
  },
  {
    id: "5",
    title: "Processus de confirmation",
    description: "Étapes détaillées pour confirmer une commande correctement.",
    duration: "8 min",
    type: "document",
    category: "Processus",
    icon: CheckCircle2,
  },
  {
    id: "6",
    title: "Quiz - Techniques d'appel",
    description: "Testez vos connaissances sur les techniques d'appel.",
    duration: "10 min",
    type: "quiz",
    category: "Évaluation",
    icon: Award,
  },
];

export function CallerTraining() {
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("caller-training-progress");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const progress = Math.round((completedModules.size / trainingModules.length) * 100);

  const handleCompleteModule = (moduleId: string) => {
    const newCompleted = new Set([...completedModules, moduleId]);
    setCompletedModules(newCompleted);
    localStorage.setItem("caller-training-progress", JSON.stringify([...newCompleted]));
  };

  const categories = [...new Set(trainingModules.map((m) => m.category))];

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "video":
        return <Badge className="bg-primary/15 text-primary">Vidéo</Badge>;
      case "document":
        return <Badge className="bg-accent/50 text-accent-foreground">Document</Badge>;
      case "quiz":
        return <Badge className="bg-warning/15 text-warning">Quiz</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const renderModuleContent = (module: TrainingModule) => {
    const isCompleted = completedModules.has(module.id);

    switch (module.id) {
      case "1":
        return (
          <TrainingStepContent
            steps={techniquesAppelSteps}
            onComplete={() => handleCompleteModule(module.id)}
            isCompleted={isCompleted}
          />
        );
      case "2":
        return (
          <TrainingStepContent
            steps={scriptsVenteSteps}
            onComplete={() => handleCompleteModule(module.id)}
            isCompleted={isCompleted}
          />
        );
      case "3":
        return (
          <TrainingStepContent
            steps={gestionObjectionsSteps}
            onComplete={() => handleCompleteModule(module.id)}
            isCompleted={isCompleted}
          />
        );
      case "4":
        return (
          <TrainingStepContent
            steps={plateformeSteps}
            onComplete={() => handleCompleteModule(module.id)}
            isCompleted={isCompleted}
          />
        );
      case "5":
        return (
          <ChecklistContent
            sections={confirmationChecklist}
            onComplete={() => handleCompleteModule(module.id)}
            isCompleted={isCompleted}
          />
        );
      case "6":
        return (
          <QuizContent
            questions={quizQuestions}
            onComplete={() => handleCompleteModule(module.id)}
            isCompleted={isCompleted}
            passingScore={75}
          />
        );
      default:
        return null;
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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedModule?.type === "video" && <PlayCircle className="w-5 h-5" />}
              {selectedModule?.type === "document" && <FileText className="w-5 h-5" />}
              {selectedModule?.type === "quiz" && <Award className="w-5 h-5" />}
              {selectedModule?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedModule && renderModuleContent(selectedModule)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
