import { useState } from "react";
import { useClientSegments, ClientSegment } from "@/hooks/useClientSegments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Users, 
  ChevronDown, 
  Eye, 
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  UserCheck,
  UserX,
  Star,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CampaignSegmentSelectorProps {
  selectedSegments: string[];
  excludedSegments: string[];
  onSelectionChange: (selected: string[], excluded: string[]) => void;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  status: CheckCircle2,
  behavior: TrendingUp,
  frequency: Calendar,
  group: Users,
  product: Star,
};

const categoryLabels: Record<string, string> = {
  status: "Segments par statut",
  behavior: "Segments par comportement",
  frequency: "Segments par fréquence",
  group: "Groupes de contacts (500)",
  product: "Segments par produit",
};

const segmentIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  all: Users,
  confirmed_paid: CheckCircle2,
  cancelled: XCircle,
  reported: Clock,
  pending: Clock,
  new: UserCheck,
  regular: Star,
  vip: Star,
  inactive_30: UserX,
  inactive_60: UserX,
  inactive_90: UserX,
  frequent: TrendingUp,
  occasional: Calendar,
  lost: UserX,
};

export function CampaignSegmentSelector({
  selectedSegments,
  excludedSegments,
  onSelectionChange,
}: CampaignSegmentSelectorProps) {
  const { segments, isLoading, getClientsForSegment } = useClientSegments();
  const [showPreview, setShowPreview] = useState(false);
  const [previewClients, setPreviewClients] = useState<{ id: string; full_name: string; phone: string }[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSegment, setPreviewSegment] = useState<string>("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['group', 'status', 'behavior', 'frequency', 'product']);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSegmentToggle = (segmentId: string, action: 'select' | 'exclude') => {
    if (action === 'select') {
      const newSelected = selectedSegments.includes(segmentId)
        ? selectedSegments.filter(s => s !== segmentId)
        : [...selectedSegments, segmentId];
      // Remove from excluded if selecting
      const newExcluded = excludedSegments.filter(s => s !== segmentId);
      onSelectionChange(newSelected, newExcluded);
    } else {
      const newExcluded = excludedSegments.includes(segmentId)
        ? excludedSegments.filter(s => s !== segmentId)
        : [...excludedSegments, segmentId];
      // Remove from selected if excluding
      const newSelected = selectedSegments.filter(s => s !== segmentId);
      onSelectionChange(newSelected, newExcluded);
    }
  };

  const handlePreviewSegment = async (segmentId: string) => {
    setPreviewLoading(true);
    setPreviewSegment(segmentId);
    try {
      const clients = await getClientsForSegment(segmentId);
      setPreviewClients(clients);
      setShowPreview(true);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExportCSV = () => {
    const csv = [
      ['Nom', 'Téléphone'],
      ...previewClients.map(c => [c.full_name, c.phone])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `segment_${previewSegment}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getTotalRecipients = () => {
    if (selectedSegments.length === 0) return 0;
    
    // Simple approach: use the count from selected segments
    // In production, you'd want to deduplicate across segments
    const selectedCounts = segments
      .filter(s => selectedSegments.includes(s.id))
      .reduce((sum, s) => sum + s.count, 0);
    
    const excludedCounts = segments
      .filter(s => excludedSegments.includes(s.id))
      .reduce((sum, s) => sum + s.count, 0);

    // This is an approximation - real deduplication would need backend support
    return Math.max(0, selectedCounts - excludedCounts);
  };

  const groupedSegments = segments.reduce((acc, segment) => {
    if (!acc[segment.category]) acc[segment.category] = [];
    acc[segment.category].push(segment);
    return acc;
  }, {} as Record<string, ClientSegment[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total Recipients Display */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <span className="font-medium">Destinataires estimés</span>
        </div>
        <Badge className="bg-primary text-primary-foreground text-lg px-3 py-1">
          {getTotalRecipients()} clients
        </Badge>
      </div>

      {/* Segment Categories */}
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {(['group', 'product', 'status', 'behavior', 'frequency'] as const).map((category) => {
            const CategoryIcon = categoryIcons[category] || Users;
            const categorySegments = groupedSegments[category] || [];

            return (
              <Collapsible
                key={category}
                open={expandedCategories.includes(category)}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2">
                    <CategoryIcon className="w-4 h-4 text-primary" />
                    <span className="font-medium">{categoryLabels[category]}</span>
                    <Badge variant="outline" className="ml-2">
                      {categorySegments.length}
                    </Badge>
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    expandedCategories.includes(category) && "rotate-180"
                  )} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="space-y-2 pl-2">
                    {categorySegments.map((segment) => {
                      const SegmentIcon = segmentIcons[segment.id] || Users;
                      const isSelected = selectedSegments.includes(segment.id);
                      const isExcluded = excludedSegments.includes(segment.id);

                      return (
                        <div
                          key={segment.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border transition-colors",
                            isSelected && "border-primary bg-primary/5",
                            isExcluded && "border-destructive bg-destructive/5",
                            !isSelected && !isExcluded && "border-border hover:border-primary/30"
                          )}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleSegmentToggle(segment.id, 'select')}
                            />
                            <SegmentIcon className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{segment.label}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {segment.count}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{segment.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handlePreviewSegment(segment.id)}
                              disabled={previewLoading && previewSegment === segment.id}
                            >
                              {previewLoading && previewSegment === segment.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant={isExcluded ? "destructive" : "outline"}
                              size="sm"
                              className="text-xs h-8"
                              onClick={() => handleSegmentToggle(segment.id, 'exclude')}
                            >
                              {isExcluded ? "Exclu" : "Exclure"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      {/* Selected & Excluded Summary */}
      {(selectedSegments.length > 0 || excludedSegments.length > 0) && (
        <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/30">
          {selectedSegments.map(id => {
            const segment = segments.find(s => s.id === id);
            return segment ? (
              <Badge key={id} className="bg-primary/20 text-primary border-primary/30">
                ✓ {segment.label}
              </Badge>
            ) : null;
          })}
          {excludedSegments.map(id => {
            const segment = segments.find(s => s.id === id);
            return segment ? (
              <Badge key={id} variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30">
                ✗ {segment.label}
              </Badge>
            ) : null;
          })}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Contacts du segment
            </DialogTitle>
            <DialogDescription>
              {previewClients.length} contacts dans ce segment
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Téléphone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewClients.slice(0, 100).map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.full_name}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                  </TableRow>
                ))}
                {previewClients.length > 100 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      ... et {previewClients.length - 100} autres
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Fermer
            </Button>
            <Button onClick={handleExportCSV} className="gap-2">
              <Download className="w-4 h-4" />
              Exporter CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
