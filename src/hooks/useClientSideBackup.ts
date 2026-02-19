import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const BATCH_SIZE = 1000;

// Tables to export - same list as the edge function, but only tables that exist in the typed schema
const BACKUP_TABLES = [
  'transactions',
  'eduzz_transactions',
  'tmb_transactions',
  'clients',
  'profiles',
  'leads',
  'goals',
  'goal_history',
  'invitations',
  'invitation_history',
  'client_users',
  'filter_views',
  'imports',
  'import_errors',
  'external_webhooks',
  'access_logs',
  'app_settings',
  'llm_integrations',
  'export_jobs',
  'backup_logs',
  'lead_deletion_logs',
  'duplicate_deletion_logs',
  'eduzz_transaction_deletion_logs',
  'permission_audit_logs',
  'known_landing_pages',
  'interest_leads',
] as const;

type TableName = typeof BACKUP_TABLES[number];

export interface BackupProgress {
  status: 'idle' | 'exporting' | 'generating' | 'complete' | 'error' | 'cancelled';
  currentTable: string;
  currentTableIndex: number;
  totalTables: number;
  currentTableRecords: number;
  totalRecords: number;
  percentage: number;
  error?: string;
}

export function useClientSideBackup() {
  const [progress, setProgress] = useState<BackupProgress>({
    status: 'idle',
    currentTable: '',
    currentTableIndex: 0,
    totalTables: BACKUP_TABLES.length,
    currentTableRecords: 0,
    totalRecords: 0,
    percentage: 0,
  });

  const cancelledRef = useRef(false);

  const cancelBackup = useCallback(() => {
    cancelledRef.current = true;
    setProgress(prev => ({ ...prev, status: 'cancelled' }));
  }, []);

  const startBackup = useCallback(async () => {
    cancelledRef.current = false;
    const startTime = Date.now();
    const tables = BACKUP_TABLES;
    const backupData: Record<string, any[]> = {};
    const tableStats: Record<string, number> = {};
    let totalRecords = 0;

    try {
      for (let i = 0; i < tables.length; i++) {
        if (cancelledRef.current) return null;

        const tableName = tables[i];

        setProgress({
          status: 'exporting',
          currentTable: tableName,
          currentTableIndex: i + 1,
          totalTables: tables.length,
          currentTableRecords: 0,
          totalRecords,
          percentage: Math.round((i / tables.length) * 100),
        });

        let allData: any[] = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          if (cancelledRef.current) return null;

          const { data, error } = await (supabase
            .from(tableName as any)
            .select('*')
            .range(offset, offset + BATCH_SIZE - 1) as any);

          if (error) {
            console.warn(`Erro ao exportar ${tableName}:`, error.message);
            break;
          }

          if (data && data.length > 0) {
            allData = allData.concat(data);
            offset += data.length;
            hasMore = data.length === BATCH_SIZE;

            setProgress(prev => ({
              ...prev,
              currentTableRecords: allData.length,
            }));
          } else {
            hasMore = false;
          }

          // Small yield to keep UI responsive
          await new Promise(r => setTimeout(r, 5));
        }

        backupData[tableName] = allData;
        tableStats[tableName] = allData.length;
        totalRecords += allData.length;
      }

      if (cancelledRef.current) return null;

      // Generate JSON
      setProgress(prev => ({
        ...prev,
        status: 'generating',
        currentTable: '',
        percentage: 95,
        totalRecords,
      }));

      const { data: { user } } = await supabase.auth.getUser();

      const response = {
        backup_info: {
          created_at: new Date().toISOString(),
          created_by: user?.email || 'unknown',
          project: 'AnalyzeFlow',
          tables_included: Object.keys(backupData),
          table_stats: tableStats,
          total_records: totalRecords,
          version: '2.0-client',
        },
        data: backupData,
      };

      const jsonString = JSON.stringify(response, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const fileSizeBytes = blob.size;
      const durationMs = Date.now() - startTime;

      // Download
      const url = URL.createObjectURL(blob);
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Log to backup_logs
      try {
        await supabase.from('backup_logs').insert({
          user_id: user?.id || '',
          status: 'success',
          tables_included: Object.keys(backupData),
          total_records: totalRecords,
          file_size_bytes: fileSizeBytes,
          duration_ms: durationMs,
          completed_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Erro ao registrar log de backup:', e);
      }

      setProgress({
        status: 'complete',
        currentTable: '',
        currentTableIndex: tables.length,
        totalTables: tables.length,
        currentTableRecords: 0,
        totalRecords,
        percentage: 100,
      });

      return { totalRecords, fileSizeBytes, durationMs };
    } catch (error: any) {
      console.error('Backup error:', error);
      setProgress(prev => ({
        ...prev,
        status: 'error',
        error: error.message || 'Erro desconhecido',
      }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setProgress({
      status: 'idle',
      currentTable: '',
      currentTableIndex: 0,
      totalTables: BACKUP_TABLES.length,
      currentTableRecords: 0,
      totalRecords: 0,
      percentage: 0,
    });
  }, []);

  return {
    progress,
    startBackup,
    cancelBackup,
    reset,
    isExporting: progress.status === 'exporting' || progress.status === 'generating',
  };
}
