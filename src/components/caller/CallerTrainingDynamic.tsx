import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
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
  Award,
  Loader2,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TrainingResource {
  id: string;
  title: string;
  description: string | null;
  type: string;
  category: string;
  url: string | null;
  youtube_id: string | null;
  duration: string | null;
  order_index: number;
}

interface UserProgress {
  id: string;
  user_id: string;
  resource_id: string;
  completed: boolean;
  progress_percent: number;
  completed_at: string | null;
}

export function CallerTrainingDynamic() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedResource, setSelectedResource] = useState<TrainingResource | null>(null);

  // Fetch training resources
  const { data: resources, isLoading: resourcesLoading } = useQuery({
    queryKey: ["training-resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_resources")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as TrainingResource[];
    },
  });

  // Fetch user progress
  const { data: userProgress, isLoading: progressLoading } = useQuery({
    queryKey: ["user-training-progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("user_training_progress")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data as UserProgress[];
    },
    enabled: !!user?.id,
  });

  // Mark as complete mutation
  const completeMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_training_progress")
        .upsert({
          user_id: user.id,
          resource_id: resourceId,
          completed: true,
          progress_percent: 100,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,resource_id",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-training-progress"] });
      toast.success("Module marqué comme terminé !");
      setSelectedResource(null);
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const isLoading = resourcesLoading || progressLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const completedIds = new Set(
    userProgress?.filter((p) => p.completed).map((p) => p.resource_id) || []
  );

  const categories = [...new Set(resources?.map((r) => r.category) || [])];
  const totalResources = resources?.length || 0;
  const completedCount = completedIds.size;
  const progressPercent = totalResources > 0 
    ? Math.round((completedCount / totalResources) * 100) 
    : 0;

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
        <p className="text-muted-foreground">Ressources dynamiques depuis la base de données</p>
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
                  {completedCount} / {totalResources} modules complétés
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">{progressPercent}%</p>
            </div>
          </div>
          <Progress value={progressPercent} className="h-3" />
        </CardContent>
      </Card>

      {/* Resources by Category */}
      {categories.length > 0 ? (
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
                {resources
                  ?.filter((r) => r.category === category)
                  .map((resource) => {
                    const isCompleted = completedIds.has(resource.id);

                    return (
                      <Card 
                        key={resource.id}
                        className={cn(
                          "cursor-pointer hover:border-primary/30 transition-colors",
                          isCompleted && "bg-success/5 border-success/30"
                        )}
                        onClick={() => setSelectedResource(resource)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "p-3 rounded-lg",
                              isCompleted ? "bg-success/10" : "bg-secondary"
                            )}>
                              {isCompleted ? (
                                <CheckCircle2 className="w-6 h-6 text-success" />
                              ) : (
                                getTypeIcon(resource.type)
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-1">
                                <h4 className="font-medium">{resource.title}</h4>
                                {isCompleted && (
                                  <CheckCircle2 className="w-5 h-5 text-success" />
                                )}
                              </div>
                              {resource.description && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {resource.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3">
                                {getTypeBadge(resource.type)}
                                {resource.duration && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {resource.duration}
                                  </span>
                                )}
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
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Aucune ressource de formation disponible</p>
          </CardContent>
        </Card>
      )}

      {/* Resource Detail Dialog */}
      <Dialog open={!!selectedResource} onOpenChange={() => setSelectedResource(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedResource && getTypeIcon(selectedResource.type)}
              {selectedResource?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedResource && (
            <div className="space-y-4">
              {selectedResource.description && (
                <p className="text-muted-foreground">{selectedResource.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm">
                {getTypeBadge(selectedResource.type)}
                {selectedResource.duration && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {selectedResource.duration}
                  </span>
                )}
              </div>

              {/* Content Display */}
              {selectedResource.type === "video" && selectedResource.youtube_id ? (
                <div className="aspect-video rounded-lg overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${selectedResource.youtube_id}`}
                    title={selectedResource.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : selectedResource.url ? (
                <Button variant="outline" className="w-full" asChild>
                  <a href={selectedResource.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ouvrir le contenu
                  </a>
                </Button>
              ) : (
                <div className="aspect-video bg-secondary/30 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    {getTypeIcon(selectedResource.type)}
                    <p className="text-sm text-muted-foreground mt-2">
                      Contenu {selectedResource.type}
                    </p>
                  </div>
                </div>
              )}

              {completedIds.has(selectedResource.id) ? (
                <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-success/10 text-success">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Module complété</span>
                </div>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={() => completeMutation.mutate(selectedResource.id)}
                  disabled={completeMutation.isPending}
                >
                  {completeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
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
