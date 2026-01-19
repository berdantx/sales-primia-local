import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { WebhookLog } from '@/hooks/useWebhookLogs';

interface DuplicatesExportData {
  logs: WebhookLog[];
  dateRange?: { start: Date; end: Date };
}

interface PlatformSummary {
  platform: string;
  count: number;
  percentage: number;
}

function getPlatformFromLog(log: WebhookLog): string {
  if (log.event_type.includes('PURCHASE')) return 'Hotmart';
  if (log.event_type.toLowerCase().startsWith('tmb_')) return 'TMB';
  if (log.event_type.toLowerCase().startsWith('eduzz_')) return 'Eduzz';
  return 'Outro';
}

function getDuplicateLogs(logs: WebhookLog[]): WebhookLog[] {
  return logs.filter((log) => log.status === 'duplicate');
}

function calculatePlatformSummary(duplicates: WebhookLog[]): PlatformSummary[] {
  const total = duplicates.length;
  if (total === 0) return [];

  const platforms: Record<string, number> = {
    Hotmart: 0,
    TMB: 0,
    Eduzz: 0,
  };

  duplicates.forEach((log) => {
    const platform = getPlatformFromLog(log);
    if (platforms[platform] !== undefined) {
      platforms[platform]++;
    }
  });

  return Object.entries(platforms)
    .filter(([_, count]) => count > 0)
    .map(([platform, count]) => ({
      platform,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export function generateDuplicatesCsv(data: DuplicatesExportData): void {
  const duplicates = getDuplicateLogs(data.logs);
  
  if (duplicates.length === 0) {
    alert('Nenhuma duplicata encontrada para exportar.');
    return;
  }

  const headers = ['Data/Hora', 'Plataforma', 'Tipo Evento', 'Código Transação', 'Erro/Motivo'];
  
  const rows = duplicates.map((log) => [
    format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
    getPlatformFromLog(log),
    log.event_type,
    log.transaction_code || '-',
    log.error_message || 'Duplicata detectada',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const dateStr = format(new Date(), 'yyyy-MM-dd', { locale: ptBR });
  const periodStr = data.dateRange 
    ? `${format(data.dateRange.start, 'dd-MM')}_a_${format(data.dateRange.end, 'dd-MM')}`
    : 'todos';
  
  link.href = url;
  link.download = `duplicatas-${periodStr}-${dateStr}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateDuplicatesExcel(data: DuplicatesExportData): void {
  const duplicates = getDuplicateLogs(data.logs);
  
  if (duplicates.length === 0) {
    alert('Nenhuma duplicata encontrada para exportar.');
    return;
  }

  const workbook = XLSX.utils.book_new();
  
  // Sheet 1: Summary
  const summary = calculatePlatformSummary(duplicates);
  const summaryData = [
    ['Relatório de Duplicatas'],
    [''],
    ['Período:', data.dateRange 
      ? `${format(data.dateRange.start, 'dd/MM/yyyy')} a ${format(data.dateRange.end, 'dd/MM/yyyy')}`
      : 'Todo período'
    ],
    ['Data do Relatório:', format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })],
    [''],
    ['Total de Duplicatas:', duplicates.length],
    [''],
    ['Resumo por Plataforma'],
    ['Plataforma', 'Quantidade', 'Percentual'],
    ...summary.map((s) => [s.platform, s.count, `${s.percentage}%`]),
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Set column widths
  summarySheet['!cols'] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
  ];
  
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
  
  // Sheet 2: Details
  const detailsHeaders = ['Data/Hora', 'Plataforma', 'Tipo Evento', 'Código Transação', 'Erro/Motivo'];
  const detailsData = [
    detailsHeaders,
    ...duplicates.map((log) => [
      format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
      getPlatformFromLog(log),
      log.event_type,
      log.transaction_code || '-',
      log.error_message || 'Duplicata detectada',
    ]),
  ];
  
  const detailsSheet = XLSX.utils.aoa_to_sheet(detailsData);
  
  // Set column widths
  detailsSheet['!cols'] = [
    { wch: 20 },
    { wch: 12 },
    { wch: 25 },
    { wch: 20 },
    { wch: 30 },
  ];
  
  XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Detalhes');
  
  // Generate file
  const dateStr = format(new Date(), 'yyyy-MM-dd', { locale: ptBR });
  const periodStr = data.dateRange 
    ? `${format(data.dateRange.start, 'dd-MM')}_a_${format(data.dateRange.end, 'dd-MM')}`
    : 'todos';
  
  XLSX.writeFile(workbook, `duplicatas-${periodStr}-${dateStr}.xlsx`);
}
