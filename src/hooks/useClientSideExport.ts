import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const BATCH_SIZE = 1000;

export interface ExportField {
  key: string;
  label: string;
  extractor: (lead: any) => string;
}

export const AVAILABLE_FIELDS: ExportField[] = [
  { key: 'created_at', label: 'Data', extractor: (l) => formatDate(l.created_at) },
  { key: 'name', label: 'Nome', extractor: (l) => `${l.first_name || ''} ${l.last_name || ''}`.trim() },
  { key: 'email', label: 'Email', extractor: (l) => l.email || '' },
  { key: 'phone', label: 'Telefone', extractor: (l) => l.phone || '' },
  { key: 'source', label: 'Fonte', extractor: (l) => l.source || '' },
  { key: 'utm_source', label: 'UTM Source', extractor: (l) => l.utm_source || '' },
  { key: 'utm_medium', label: 'UTM Medium', extractor: (l) => l.utm_medium || '' },
  { key: 'utm_campaign', label: 'UTM Campaign', extractor: (l) => l.utm_campaign || '' },
  { key: 'utm_content', label: 'UTM Content', extractor: (l) => l.utm_content || '' },
  { key: 'tags', label: 'Tags', extractor: (l) => l.tags || '' },
  { key: 'page_url', label: 'Página', extractor: (l) => l.page_url || '' },
  { key: 'country', label: 'País', extractor: (l) => l.country || '' },
  { key: 'city', label: 'Cidade', extractor: (l) => l.city || '' },
  { key: 'traffic_type', label: 'Tipo Tráfego', extractor: (l) => l.traffic_type || '' },
];

export const ALL_FIELD_KEYS = AVAILABLE_FIELDS.map(f => f.key);

interface ExportFilters {
  clientId?: string;
  startDate?: Date;
  endDate?: Date;
  excludeTests?: boolean;
  selectedFields?: string[];
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  trafficType?: string;
  country?: string;
  pageUrl?: string;
  search?: string;
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
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
};

const escapeCSV = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;

function buildCSVRow(lead: any, fields: ExportField[]): string {
  return fields.map(f => escapeCSV(f.extractor(lead))).join(',');
}

function buildCSVHeaders(fields: ExportField[]): string {
  return fields.map(f => f.label).join(',');
}

export function useClientSideExport() {
  const [progress, setProgress] = useState<ExportProgress>({
    status: 'idle', processed: 0, total: 0, percentage: 0,
  });
  
  const cancelledRef = useRef(false);

  const cancelExport = useCallback(() => {
    cancelledRef.current = true;
    setProgress(prev => ({ ...prev, status: 'cancelled' }));
  }, []);

  const startExport = useCallback(async (filters: ExportFilters) => {
    cancelledRef.current = false;
    
    const selectedKeys = filters.selectedFields?.length ? filters.selectedFields : ALL_FIELD_KEYS;
    const fields = AVAILABLE_FIELDS.filter(f => selectedKeys.includes(f.key));
    
    try {
      setProgress({ status: 'counting', processed: 0, total: 0, percentage: 0 });
      
      const { data: countData, error: countError } = await supabase
        .rpc('count_leads_for_export', {
          p_client_id: filters.clientId || null,
          p_start_date: filters.startDate?.toISOString() || null,
          p_end_date: filters.endDate?.toISOString() || null,
          p_source: filters.source || null,
          p_utm_source: filters.utmSource || null,
          p_utm_medium: filters.utmMedium || null,
          p_utm_campaign: filters.utmCampaign || null,
          p_utm_content: filters.utmContent || null,
          p_utm_term: filters.utmTerm || null,
          p_traffic_type: filters.trafficType || null,
          p_country: filters.country || null,
          p_page_url: filters.pageUrl || null,
          p_search: filters.search || null,
        });

      if (countError) throw new Error(`Erro ao contar leads: ${countError.message}`);

      const totalCount = Number(countData) || 0;

      if (totalCount === 0) {
        setProgress({ status: 'error', processed: 0, total: 0, percentage: 0,
          error: 'Nenhum lead encontrado para o período selecionado' });
        return null;
      }

      setProgress({ status: 'exporting', processed: 0, total: totalCount, percentage: 0 });
      
      const csvRows: string[] = ['\uFEFF' + buildCSVHeaders(fields)];
      let processedCount = 0;
      let page = 0;
      let filteredCount = 0;

      while (processedCount < totalCount) {
        if (cancelledRef.current) return null;

        const { data, error } = await supabase
          .rpc('export_leads_batch', {
            p_client_id: filters.clientId || null,
            p_start_date: filters.startDate?.toISOString() || null,
            p_end_date: filters.endDate?.toISOString() || null,
            p_offset: page * BATCH_SIZE,
            p_limit: BATCH_SIZE,
            p_source: filters.source || null,
            p_utm_source: filters.utmSource || null,
            p_utm_medium: filters.utmMedium || null,
            p_utm_campaign: filters.utmCampaign || null,
            p_utm_content: filters.utmContent || null,
            p_utm_term: filters.utmTerm || null,
            p_traffic_type: filters.trafficType || null,
            p_country: filters.country || null,
            p_page_url: filters.pageUrl || null,
            p_search: filters.search || null,
          });

        if (error) throw new Error(`Erro ao buscar leads: ${error.message}`);
        if (!data || data.length === 0) break;

        for (const lead of data) {
          if (filters.excludeTests && lead.tags) {
            if (lead.tags.includes('[TESTE]') || lead.tags.toLowerCase().includes('teste')) continue;
          }
          csvRows.push(buildCSVRow(lead, fields));
          filteredCount++;
        }

        processedCount += data.length;
        page++;

        setProgress({ 
          status: 'exporting', processed: processedCount, total: totalCount,
          percentage: Math.round((processedCount / totalCount) * 100)
        });

        await new Promise(resolve => setTimeout(resolve, 10));
      }

      if (cancelledRef.current) return null;

      setProgress({ status: 'generating', processed: totalCount, total: totalCount, percentage: 100 });
      
      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '-');
      const suffix = filters.excludeTests ? '-sem-testes' : '';
      const fileName = `leads${suffix}-${dateStr}-${timeStr}.csv`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress({ status: 'complete', processed: filteredCount, total: totalCount, percentage: 100 });
      return { fileName, totalRecords: filteredCount };

    } catch (error: any) {
      console.error('Export error:', error);
      setProgress({ status: 'error', processed: 0, total: 0, percentage: 0,
        error: error.message || 'Erro desconhecido durante a exportação' });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setProgress({ status: 'idle', processed: 0, total: 0, percentage: 0 });
  }, []);

  return {
    progress, startExport, cancelExport, reset,
    isExporting: progress.status === 'counting' || progress.status === 'exporting' || progress.status === 'generating',
  };
}
