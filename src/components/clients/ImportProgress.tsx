import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, XCircle, CheckCircle2 } from 'lucide-react';
import { ImportProgress as ImportProgressType, ImportStats } from '@/hooks/useClientImport';

interface ImportProgressProps {
  progress: ImportProgressType;
  stats: ImportStats;
  onCancel: () => void;
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `~${minutes} min ${remainingSeconds} sec`;
  }
  return `~${remainingSeconds} sec`;
}

export function ImportProgressComponent({ progress, stats, onCancel }: ImportProgressProps) {
  const isImporting = progress.status === 'importing';
  const isComplete = progress.status === 'complete';
  const isCancelled = progress.status === 'cancelled';
  const hasError = progress.status === 'error';

  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className="flex items-center gap-2">
        {isImporting && (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="font-medium">Import en cours...</span>
          </>
        )}
        {isComplete && (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="font-medium text-green-600">Import terminé !</span>
          </>
        )}
        {isCancelled && (
          <>
            <XCircle className="h-5 w-5 text-orange-500" />
            <span className="font-medium text-orange-600">Import annulé</span>
          </>
        )}
        {hasError && (
          <>
            <XCircle className="h-5 w-5 text-destructive" />
            <span className="font-medium text-destructive">Erreur: {progress.errorMessage}</span>
          </>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <Progress value={progress.progress} className="h-3" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{Math.round(progress.progress)}%</span>
          <span>
            {progress.importedCount.toLocaleString('fr-FR')} / {progress.totalClients.toLocaleString('fr-FR')} clients
          </span>
        </div>
      </div>

      {/* Batch info */}
      {isImporting && (
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Lot actuel : {progress.currentBatch} / {progress.totalBatches}</p>
          {progress.estimatedTimeRemaining !== undefined && (
            <p>Temps restant estimé : {formatTime(progress.estimatedTimeRemaining)}</p>
          )}
        </div>
      )}

      {/* Stats */}
      {(isComplete || isCancelled) && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="p-2 bg-green-500/10 rounded-md">
            <span className="text-green-600 font-medium">{stats.inserted.toLocaleString('fr-FR')}</span>
            <span className="text-muted-foreground ml-1">ajoutés</span>
          </div>
          <div className="p-2 bg-blue-500/10 rounded-md">
            <span className="text-blue-600 font-medium">{stats.updated.toLocaleString('fr-FR')}</span>
            <span className="text-muted-foreground ml-1">mis à jour</span>
          </div>
          <div className="p-2 bg-orange-500/10 rounded-md">
            <span className="text-orange-600 font-medium">{stats.skipped.toLocaleString('fr-FR')}</span>
            <span className="text-muted-foreground ml-1">ignorés</span>
          </div>
          <div className="p-2 bg-destructive/10 rounded-md">
            <span className="text-destructive font-medium">{stats.errors.toLocaleString('fr-FR')}</span>
            <span className="text-muted-foreground ml-1">erreurs</span>
          </div>
        </div>
      )}

      {/* Cancel button */}
      {isImporting && (
        <Button variant="outline" onClick={onCancel} className="w-full">
          <XCircle className="h-4 w-4 mr-2" />
          Annuler l'import
        </Button>
      )}
    </div>
  );
}
