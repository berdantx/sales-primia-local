import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const BATCH_SIZE = 1000;

interface ExportFilters {
  clientId?: string;
  startDate?: Date;
  endDate?: Date;
  excludeTests?: boolean;
}

interface ExportProgress {
  status: 'idle' | 'counting' | 'exporting' | 'generating' | 'complete' | 'error' | 'cancelled';
  processed: number;
  total: number;
  percentage: number;
  error?: string;
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('pt-BR', { 
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
};

const escapeCSV = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;

const CSV_HEADERS = 'Data,Nome,Email,Telefone,Fonte,UTM Source,UTM Medium,UTM Campaign,UTM Content,Tags,Página,País,Cidade,Tipo Tráfego';

function leadToCSVRow(l: any): string {
  return [
    formatDate(l.created_at),
    `${l.first_name || ''} ${l.last_name || ''}`.trim(),
    l.email || '',
    l.phone || '',
    l.source || '',
    l.utm_source || '',
    l.utm_medium || '',
    l.utm_campaign || '',
    l.utm_content || '',
    l.tags || '',
    l.page_url || '',
    l.country || '',
    l.city || '',
    l.traffic_type || '',
  ].map(escapeCSV).join(',');
}

export function useClientSideExport() {
  const [progress, setProgress] = useState<ExportProgress>({
    status: 'idle',
    processed: 0,
    total: 0,
    percentage: 0,
  });
  
  const cancelledRef = useRef(false);

  const cancelExport = useCallback(() => {
    cancelledRef.current = true;
    setProgress(prev => ({ ...prev, status: 'cancelled' }));
  }, []);

  const startExport = useCallback(async (filters: ExportFilters) => {
    cancelledRef.current = false;
    
    try {
      // Step 1: Count total leads using optimized RPC
      setProgress({ status: 'counting', processed: 0, total: 0, percentage: 0 });
      
      const { data: countData, error: countError } = await supabase
        .rpc('count_leads_for_export', {
          p_client_id: filters.clientId || null,
          p_start_date: filters.startDate?.toISOString() || null,
          p_end_date: filters.endDate?.toISOString() || null,
        });

      if (countError) {
        throw new Error(`Erro ao contar leads: ${countError.message}`);
      }

      const totalCount = Number(countData) || 0;

      if (totalCount === 0) {
        setProgress({ 
          status: 'error', 
          processed: 0, 
          total: 0, 
          percentage: 0,
          error: 'Nenhum lead encontrado para o período selecionado'
        });
        return null;
      }

      // Step 2: Fetch leads in batches
      setProgress({ status: 'exporting', processed: 0, total: totalCount, percentage: 0 });
      
      const csvRows: string[] = ['\uFEFF' + CSV_HEADERS]; // BOM for Excel compatibility
      let processedCount = 0;
      let page = 0;
      let filteredCount = 0;

      while (processedCount < totalCount) {
        if (cancelledRef.current) {
          return null;
        }

        // Use optimized RPC for batch fetching
        const { data, error } = await supabase
          .rpc('export_leads_batch', {
            p_client_id: filters.clientId || null,
            p_start_date: filters.startDate?.toISOString() || null,
            p_end_date: filters.endDate?.toISOString() || null,
            p_offset: page * BATCH_SIZE,
            p_limit: BATCH_SIZE,
          });

        if (error) {
          throw new Error(`Erro ao buscar leads: ${error.message}`);
        }

        if (!data || data.length === 0) {
          break;
        }

        // Process batch
        for (const lead of data) {
          // Skip test leads if requested
          if (filters.excludeTests && lead.tags) {
            if (lead.tags.includes('[TESTE]') || lead.tags.toLowerCase().includes('teste')) {
              continue;
            }
          }
          csvRows.push(leadToCSVRow(lead));
          filteredCount++;
        }

        processedCount += data.length;
        page++;

        const percentage = Math.round((processedCount / totalCount) * 100);
        setProgress({ 
          status: 'exporting', 
          processed: processedCount, 
          total: totalCount, 
          percentage 
        });

        // Small delay to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      if (cancelledRef.current) {
        return null;
      }

      // Step 3: Generate CSV file
      setProgress({ status: 'generating', processed: totalCount, total: totalCount, percentage: 100 });
      
      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      
      // Generate filename
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '-');
      const suffix = filters.excludeTests ? '-sem-testes' : '';
      const fileName = `leads${suffix}-${dateStr}-${timeStr}.csv`;

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress({ 
        status: 'complete', 
        processed: filteredCount, 
        total: totalCount, 
        percentage: 100 
      });

      return { fileName, totalRecords: filteredCount };

    } catch (error: any) {
      console.error('Export error:', error);
      setProgress({ 
        status: 'error', 
        processed: 0, 
        total: 0, 
        percentage: 0,
        error: error.message || 'Erro desconhecido durante a exportação'
      });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setProgress({
      status: 'idle',
      processed: 0,
      total: 0,
      percentage: 0,
    });
  }, []);

  return {
    progress,
    startExport,
    cancelExport,
    reset,
    isExporting: progress.status === 'counting' || progress.status === 'exporting' || progress.status === 'generating',
  };
}
