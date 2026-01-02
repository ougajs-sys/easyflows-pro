import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useSmsTemplates, SmsTemplate } from "@/hooks/useSmsTemplates";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Plus, 
  Edit, 
  Trash2, 
  FileText,
  Megaphone,
  TrendingUp,
  Bell,
  Sparkles,
  Save,
  X
} from "lucide-react";

interface SmsTemplatesManagerProps {
  onSelectTemplate?: (template: SmsTemplate) => void;
  mode?: 'manage' | 'select';
}

export const SmsTemplatesManager = ({ onSelectTemplate, mode = 'manage' }: SmsTemplatesManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);
  const { toast } = useToast();
  const { templates, templatesByCategory, isLoading, createTemplate, updateTemplate, deleteTemplate } = useSmsTemplates();

  const [formData, setFormData] = useState({
    name: "",
    category: "custom" as 'promotion' | 'relance' | 'notification' | 'custom',
    message: "",
    variables: [] as string[],
  });

  const extractVariables = (message: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = [];
    let match;
    while ((match = regex.exec(message)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }
    return matches;
  };

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      category: "custom",
      message: "",
      variables: [],
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (template: SmsTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      message: template.message,
      variables: template.variables || [],
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.message) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs", variant: "destructive" });
      return;
    }

    const variables = extractVariables(formData.message);

    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({
          id: editingTemplate.id,
          name: formData.name,
          category: formData.category,
          message: formData.message,
          variables,
        });
        toast({ title: "Succès", description: "Template modifié avec succès" });
      } else {
        await createTemplate.mutateAsync({
          name: formData.name,
          category: formData.category,
          message: formData.message,
          variables,
          is_active: true,
        });
        toast({ title: "Succès", description: "Template créé avec succès" });
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id);
      toast({ title: "Succès", description: "Template supprimé" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'promotion': return <Megaphone className="h-4 w-4" />;
      case 'relance': return <TrendingUp className="h-4 w-4" />;
      case 'notification': return <Bell className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'promotion': return 'Promotion';
      case 'relance': return 'Relance';
      case 'notification': return 'Notification';
      case 'custom': return 'Personnalisé';
      default: return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'promotion': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'relance': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'notification': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    }
  };

  if (mode === 'select') {
    return (
      <div className="space-y-3">
        <Tabs defaultValue="promotion" className="w-full">
          <TabsList className="grid grid-cols-4 h-8">
            <TabsTrigger value="promotion" className="text-xs gap-1">
              <Megaphone className="h-3 w-3" />
              Promo
            </TabsTrigger>
            <TabsTrigger value="relance" className="text-xs gap-1">
              <TrendingUp className="h-3 w-3" />
              Relance
            </TabsTrigger>
            <TabsTrigger value="notification" className="text-xs gap-1">
              <Bell className="h-3 w-3" />
              Notif
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-xs gap-1">
              <Sparkles className="h-3 w-3" />
              Custom
            </TabsTrigger>
          </TabsList>
          
          {(['promotion', 'relance', 'notification', 'custom'] as const).map(cat => (
            <TabsContent key={cat} value={cat} className="mt-2">
              <ScrollArea className="h-[150px]">
                <div className="space-y-2">
                  {templatesByCategory[cat].length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Aucun template disponible
                    </p>
                  ) : (
                    templatesByCategory[cat].map(template => (
                      <div
                        key={template.id}
                        onClick={() => onSelectTemplate?.(template)}
                        className="p-2 rounded border border-border hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors"
                      >
                        <p className="text-xs font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {template.message}
                        </p>
                        {template.variables && template.variables.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {template.variables.map(v => (
                              <Badge key={v} variant="outline" className="text-[10px] py-0 px-1">
                                {`{{${v}}}`}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Templates SMS
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleOpenCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Modifier le template" : "Créer un template"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom du template</Label>
                <Input 
                  placeholder="Ex: Promo été"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v: 'promotion' | 'relance' | 'notification' | 'custom') => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promotion">
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4" />
                        Promotion
                      </div>
                    </SelectItem>
                    <SelectItem value="relance">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Relance clients
                      </div>
                    </SelectItem>
                    <SelectItem value="notification">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Notification
                      </div>
                    </SelectItem>
                    <SelectItem value="custom">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Personnalisé
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea 
                  placeholder="Rédigez votre message. Utilisez {{variable}} pour les champs dynamiques."
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{formData.message.length}/160 caractères</p>
                  {extractVariables(formData.message).length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {extractVariables(formData.message).map(v => (
                        <Badge key={v} variant="outline" className="text-[10px]">
                          {`{{${v}}}`}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-2">Variables disponibles :</p>
                <div className="flex gap-2 flex-wrap">
                  {['prenom', 'nom', 'telephone', 'montant', 'produit', 'date'].map(v => (
                    <Badge 
                      key={v} 
                      variant="secondary" 
                      className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => setFormData({ ...formData, message: formData.message + `{{${v}}}` })}
                    >
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsDialogOpen(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleSave}
                  disabled={createTemplate.isPending || updateTemplate.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingTemplate ? "Modifier" : "Créer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun template créé</p>
            <p className="text-sm">Créez votre premier template pour simplifier vos campagnes</p>
          </div>
        ) : (
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="hidden md:table-cell">Message</TableHead>
                  <TableHead className="hidden md:table-cell">Variables</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>
                      <Badge className={getCategoryColor(template.category)}>
                        <span className="flex items-center gap-1">
                          {getCategoryIcon(template.category)}
                          {getCategoryLabel(template.category)}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[200px]">
                      <p className="truncate text-muted-foreground text-sm">
                        {template.message}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {template.variables?.map(v => (
                          <Badge key={v} variant="outline" className="text-[10px]">
                            {v}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleOpenEdit(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer ce template ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. Le template "{template.name}" sera définitivement supprimé.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(template.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
