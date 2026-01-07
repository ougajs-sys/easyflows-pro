import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  GraduationCap, 
  PlayCircle, 
  FileText, 
  CheckCircle,
  BookOpen,
  Video,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Module {
  id: string;
  title: string;
  description: string;
  type: "video" | "document" | "quiz";
  duration: string;
  completed: boolean;
}

const trainingModules: Module[] = [
  {
    id: "1",
    title: "Introduction à l'application",
    description: "Découvrez les fonctionnalités principales de l'application livreur",
    type: "video",
    duration: "5 min",
    completed: true,
  },
  {
    id: "2",
    title: "Gestion des commandes",
    description: "Apprenez à recevoir, traiter et finaliser vos livraisons",
    type: "video",
    duration: "8 min",
    completed: true,
  },
  {
    id: "3",
    title: "Communication avec les clients",
    description: "Bonnes pratiques pour une communication professionnelle",
    type: "document",
    duration: "10 min",
    completed: false,
  },
  {
    id: "4",
    title: "Gestion des paiements",
    description: "Comment collecter et reverser les paiements correctement",
    type: "video",
    duration: "6 min",
    completed: false,
  },
  {
    id: "5",
    title: "Gestion des problèmes",
    description: "Que faire en cas de commande annulée ou reportée",
    type: "document",
    duration: "8 min",
    completed: false,
  },
  {
    id: "6",
    title: "Quiz final",
    description: "Testez vos connaissances avant de commencer",
    type: "quiz",
    duration: "15 min",
    completed: false,
  },
];

export function DeliveryTraining() {
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);

  const completedCount = trainingModules.filter(m => m.completed).length;
  const progressPercent = (completedCount / trainingModules.length) * 100;

  const getModuleIcon = (type: Module["type"]) => {
    switch (type) {
      case "video":
        return Video;
      case "document":
        return FileText;
      case "quiz":
        return BookOpen;
      default:
        return FileText;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Formation</h2>
        <p className="text-muted-foreground">
          Ressources et tutoriels pour maîtriser l'outil
        </p>
      </div>

      {/* Progress Card */}
      <Card className="glass bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Votre progression</h3>
              <p className="text-sm text-muted-foreground">
                {completedCount} sur {trainingModules.length} modules complétés
              </p>
            </div>
            <Badge variant="outline" className="text-primary border-primary">
              {Math.round(progressPercent)}%
            </Badge>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Modules List */}
        <div className="lg:col-span-1">
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Modules de formation</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-2 space-y-1">
                  {trainingModules.map((module) => {
                    const Icon = getModuleIcon(module.type);
                    const isSelected = selectedModule?.id === module.id;
                    
                    return (
                      <button
                        key={module.id}
                        onClick={() => setSelectedModule(module)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                          isSelected 
                            ? "bg-primary/10 border border-primary/30" 
                            : "hover:bg-muted/50"
                        )}
                      >
                        <div className={cn(
                          "p-2 rounded-lg",
                          module.completed ? "bg-success/10" : "bg-muted"
                        )}>
                          {module.completed ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : (
                            <Icon className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            module.completed ? "text-success" : "text-foreground"
                          )}>
                            {module.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {module.duration}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2">
          <Card className="glass h-[480px] flex flex-col">
            {selectedModule ? (
              <>
                <CardHeader className="border-b border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{selectedModule.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedModule.description}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {selectedModule.type === "video" && "Vidéo"}
                      {selectedModule.type === "document" && "Document"}
                      {selectedModule.type === "quiz" && "Quiz"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center p-6">
                  {selectedModule.type === "video" ? (
                    <div className="text-center space-y-4">
                      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <PlayCircle className="w-12 h-12 text-primary" />
                      </div>
                      <div>
                        <p className="text-foreground font-medium">Vidéo de formation</p>
                        <p className="text-sm text-muted-foreground">
                          Durée: {selectedModule.duration}
                        </p>
                      </div>
                      <Button className="gap-2">
                        <PlayCircle className="w-4 h-4" />
                        Lancer la vidéo
                      </Button>
                    </div>
                  ) : selectedModule.type === "document" ? (
                    <div className="text-center space-y-4">
                      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <FileText className="w-12 h-12 text-primary" />
                      </div>
                      <div>
                        <p className="text-foreground font-medium">Document de formation</p>
                        <p className="text-sm text-muted-foreground">
                          Temps de lecture: {selectedModule.duration}
                        </p>
                      </div>
                      <Button className="gap-2">
                        <FileText className="w-4 h-4" />
                        Ouvrir le document
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <BookOpen className="w-12 h-12 text-primary" />
                      </div>
                      <div>
                        <p className="text-foreground font-medium">Quiz de validation</p>
                        <p className="text-sm text-muted-foreground">
                          Durée estimée: {selectedModule.duration}
                        </p>
                      </div>
                      <Button className="gap-2">
                        <BookOpen className="w-4 h-4" />
                        Commencer le quiz
                      </Button>
                    </div>
                  )}
                </CardContent>
                {!selectedModule.completed && (
                  <div className="p-4 border-t border-border">
                    <Button variant="outline" className="w-full">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Marquer comme terminé
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
                    <GraduationCap className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium">Sélectionnez un module</p>
                    <p className="text-sm text-muted-foreground">
                      Choisissez un module dans la liste pour commencer
                    </p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
