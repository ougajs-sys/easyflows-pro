import { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, FileText, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useClientImport, DuplicateMode } from '@/hooks/useClientImport';
import { ImportProgressComponent } from './ImportProgress';
import { getCSVPreview, mapColumns } from '@/lib/csvParser';
import { cn } from '@/lib/utils';

interface ClientImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export function ClientImportDialog({ open, onOpenChange }: ClientImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>('ignore');
  
  const {
    parseFile,
    importClients,
    cancelImport,
    reset,
    validationResult,
    importProgress,
    importStats,
  } = useClientImport();

  const handleFileSelect = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      return;
    }
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return;
    }
    
    setSelectedFile(file);
    
    // Get preview
    const content = await file.text();
    const previewData = getCSVPreview(content, 10);
    setPreview(previewData);
    
    // Parse and validate
    await parseFile(file);
  }, [parseFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleImport = async () => {
    if (!validationResult?.valid.length) return;
    await importClients(validationResult.valid, duplicateMode);
  };

  const handleClose = () => {
    if (importProgress.status === 'importing') {
      return; // Don't close while importing
    }
    reset();
    setSelectedFile(null);
    setPreview(null);
    onOpenChange(false);
  };

  const isImporting = importProgress.status === 'importing';
  const isComplete = importProgress.status === 'complete' || importProgress.status === 'cancelled';
  const canImport = validationResult?.valid.length && !isImporting && !isComplete;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des clients</DialogTitle>
          <DialogDescription>
            Importez vos clients depuis un fichier CSV. Formats acceptés : nom, téléphone, ville.
          </DialogDescription>
        </DialogHeader>

        {/* File dropzone - only show if no file selected and not importing */}
        {!selectedFile && !isImporting && !isComplete && (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleInputChange}
            />
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-1">Glissez votre fichier CSV ici</p>
            <p className="text-sm text-muted-foreground mb-2">ou cliquez pour sélectionner</p>
            <p className="text-xs text-muted-foreground">Formats acceptés : .csv (max 20 MB)</p>
          </div>
        )}

        {/* File info */}
        {selectedFile && !isImporting && !isComplete && (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <FileText className="h-8 w-8 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                setPreview(null);
                reset();
              }}
            >
              Changer
            </Button>
          </div>
        )}

        {/* Preview table */}
        {preview && !isImporting && !isComplete && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Prévisualisation ({preview.rows.length} premières lignes) :</p>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {preview.headers.slice(0, 4).map((header, i) => (
                      <TableHead key={i} className="whitespace-nowrap">
                        {header}
                      </TableHead>
                    ))}
                    {preview.headers.length > 4 && (
                      <TableHead>...</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      {row.slice(0, 4).map((cell, j) => (
                        <TableCell key={j} className="max-w-[150px] truncate">
                          {cell}
                        </TableCell>
                      ))}
                      {row.length > 4 && (
                        <TableCell>...</TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Validation summary */}
        {validationResult && !isImporting && !isComplete && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Résumé de la validation :</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-md">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">
                  <strong>{validationResult.valid.length.toLocaleString('fr-FR')}</strong> valides
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-orange-500/10 rounded-md">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-sm">
                  <strong>{validationResult.duplicates.length.toLocaleString('fr-FR')}</strong> doublons
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-md">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm">
                  <strong>{validationResult.invalid.length.toLocaleString('fr-FR')}</strong> invalides
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Invalid rows details */}
        {validationResult && validationResult.invalid.length > 0 && !isImporting && !isComplete && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-destructive">
              Lignes invalides ({Math.min(5, validationResult.invalid.length)} premières) :
            </p>
            <div className="text-xs space-y-1 max-h-24 overflow-y-auto">
              {validationResult.invalid.slice(0, 5).map((item, i) => (
                <p key={i} className="text-muted-foreground">
                  Ligne {item.row}: {item.error}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Duplicate mode selection */}
        {validationResult?.valid.length && !isImporting && !isComplete && (
          <div className="space-y-3">
            <p className="text-sm font-medium">En cas de doublon (même numéro de téléphone) :</p>
            <RadioGroup value={duplicateMode} onValueChange={(v) => setDuplicateMode(v as DuplicateMode)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ignore" id="ignore" />
                <Label htmlFor="ignore">Ignorer les doublons</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="update" id="update" />
                <Label htmlFor="update">Mettre à jour les infos existantes</Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Import progress */}
        {(isImporting || isComplete) && (
          <ImportProgressComponent
            progress={importProgress}
            stats={importStats}
            onCancel={cancelImport}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            {isComplete ? 'Fermer' : 'Annuler'}
          </Button>
          {canImport && (
            <Button onClick={handleImport}>
              Importer {validationResult.valid.length.toLocaleString('fr-FR')} clients
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
