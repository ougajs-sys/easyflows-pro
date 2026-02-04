import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseAndValidateCSV, ParsedClient, ValidationResult } from '@/lib/csvParser';
import { toast } from 'sonner';

const BATCH_SIZE = 500;

export type DuplicateMode = 'ignore' | 'update';

export interface ImportProgress {
  status: 'idle' | 'parsing' | 'validating' | 'importing' | 'complete' | 'error' | 'cancelled';
  totalClients: number;
  importedCount: number;
  currentBatch: number;
  totalBatches: number;
  progress: number;
  startTime?: number;
  estimatedTimeRemaining?: number;
  errorMessage?: string;
}

export interface ImportStats {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
}

export function useClientImport() {
  const queryClient = useQueryClient();
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    status: 'idle',
    totalClients: 0,
    importedCount: 0,
    currentBatch: 0,
    totalBatches: 0,
    progress: 0,
  });
  const [importStats, setImportStats] = useState<ImportStats>({
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  });
  
  const cancelRef = useRef(false);

  const parseFile = useCallback(async (file: File): Promise<ValidationResult | null> => {
    setImportProgress(prev => ({ ...prev, status: 'parsing' }));
    
    try {
      const content = await file.text();
      
      setImportProgress(prev => ({ ...prev, status: 'validating' }));
      const result = parseAndValidateCSV(content);
      
      setValidationResult(result);
      setImportProgress(prev => ({
        ...prev,
        status: 'idle',
        totalClients: result.valid.length,
        totalBatches: Math.ceil(result.valid.length / BATCH_SIZE),
      }));
      
      return result;
    } catch (error) {
      console.error('Error parsing CSV:', error);
      setImportProgress(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'Erreur lors de la lecture du fichier CSV',
      }));
      return null;
    }
  }, []);

  const checkExistingPhones = useCallback(async (phones: string[]): Promise<Set<string>> => {
    const existingPhones = new Set<string>();
    
    // Check in batches to avoid query limits
    for (let i = 0; i < phones.length; i += 1000) {
      const batch = phones.slice(i, i + 1000);
      const { data } = await supabase
        .from('clients')
        .select('phone')
        .in('phone', batch);
      
      if (data) {
        data.forEach(client => existingPhones.add(client.phone));
      }
    }
    
    return existingPhones;
  }, []);

  const importClients = useCallback(async (
    clients: ParsedClient[],
    duplicateMode: DuplicateMode
  ): Promise<ImportStats> => {
    cancelRef.current = false;
    const stats: ImportStats = { inserted: 0, updated: 0, skipped: 0, errors: 0 };
    const startTime = Date.now();
    
    setImportProgress({
      status: 'importing',
      totalClients: clients.length,
      importedCount: 0,
      currentBatch: 0,
      totalBatches: Math.ceil(clients.length / BATCH_SIZE),
      progress: 0,
      startTime,
    });
    setImportStats(stats);

    try {
      // First, check which phones already exist
      const allPhones = clients.map(c => c.phone);
      const existingPhones = await checkExistingPhones(allPhones);
      
      // Separate new clients from potential updates
      const newClients: ParsedClient[] = [];
      const updateClients: ParsedClient[] = [];
      
      clients.forEach(client => {
        if (existingPhones.has(client.phone)) {
          if (duplicateMode === 'update') {
            updateClients.push(client);
          } else {
            stats.skipped++;
          }
        } else {
          newClients.push(client);
        }
      });

      // Process new clients in batches
      const allClientsToProcess = duplicateMode === 'update' 
        ? [...newClients, ...updateClients]
        : newClients;

      for (let i = 0; i < allClientsToProcess.length; i += BATCH_SIZE) {
        if (cancelRef.current) {
          setImportProgress(prev => ({ ...prev, status: 'cancelled' }));
          return stats;
        }

        const batch = allClientsToProcess.slice(i, i + BATCH_SIZE);
        const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
        
        // Prepare batch data with segment = 'new'
        const batchData = batch.map(client => ({
          full_name: client.full_name,
          phone: client.phone,
          city: client.city || null,
          zone: client.zone || null,
          address: client.address || null,
          notes: client.notes || null,
          segment: 'new' as const,
        }));

        const { error, data } = await supabase
          .from('clients')
          .upsert(batchData, {
            onConflict: 'phone',
            ignoreDuplicates: false,
          })
          .select('id');

        if (error) {
          console.error('Batch import error:', error);
          stats.errors += batch.length;
        } else {
          // Count actual insertions vs updates
          batch.forEach(client => {
            if (existingPhones.has(client.phone)) {
              stats.updated++;
            } else {
              stats.inserted++;
            }
          });
        }

        const importedCount = Math.min(i + BATCH_SIZE, allClientsToProcess.length);
        const progress = (importedCount / allClientsToProcess.length) * 100;
        const elapsed = Date.now() - startTime;
        const estimatedTotal = (elapsed / importedCount) * allClientsToProcess.length;
        const estimatedRemaining = Math.max(0, estimatedTotal - elapsed);

        setImportProgress({
          status: 'importing',
          totalClients: allClientsToProcess.length,
          importedCount,
          currentBatch,
          totalBatches: Math.ceil(allClientsToProcess.length / BATCH_SIZE),
          progress,
          startTime,
          estimatedTimeRemaining: estimatedRemaining,
        });
        setImportStats({ ...stats });
      }

      // Add skipped count for ignored duplicates
      if (duplicateMode === 'ignore') {
        stats.skipped = existingPhones.size;
      }

      setImportProgress(prev => ({ ...prev, status: 'complete', progress: 100 }));
      setImportStats(stats);
      
      // Invalidate clients query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      
      toast.success(`Import terminé: ${stats.inserted} ajoutés, ${stats.updated} mis à jour`);
      
      return stats;
    } catch (error) {
      console.error('Import error:', error);
      setImportProgress(prev => ({
        ...prev,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Erreur inconnue',
      }));
      toast.error('Erreur lors de l\'import');
      return stats;
    }
  }, [queryClient, checkExistingPhones]);

  const cancelImport = useCallback(() => {
    cancelRef.current = true;
    toast.info('Annulation de l\'import...');
  }, []);

  const reset = useCallback(() => {
    setValidationResult(null);
    setImportProgress({
      status: 'idle',
      totalClients: 0,
      importedCount: 0,
      currentBatch: 0,
      totalBatches: 0,
      progress: 0,
    });
    setImportStats({
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    });
    cancelRef.current = false;
  }, []);

  return {
    parseFile,
    importClients,
    cancelImport,
    reset,
    validationResult,
    importProgress,
    importStats,
  };
}
