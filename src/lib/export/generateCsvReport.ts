import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateTimeBR } from '@/lib/dateUtils';

interface HotmartTransaction {
  transaction_code: string;
  product: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  currency: string;
  country: string | null;
  computed_value: number;
  purchase_date: string | null;
  billing_type: string | null;
  payment_method: string | null;
}

interface TmbTransaction {
  order_id: string;
  product: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  ticket_value: number;
  effective_date: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

interface EduzzTransaction {
  sale_id: string;
  product: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  sale_value: number;
  sale_date: string | null;
  status: string;
  payment_method: string | null;
  currency: string | null;
  utm_source: string | null;
}

interface CsvExportOptions {
  includeHotmart: boolean;
  includeTmb: boolean;
  includeEduzz: boolean;
  includeCombined: boolean;
  clientName?: string;
  dateRange?: { start: Date; end: Date } | null;
}

interface CsvExportData {
  hotmartTransactions: HotmartTransaction[];
  tmbTransactions: TmbTransaction[];
  eduzzTransactions: EduzzTransaction[];
}

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDateForExport(dateStr: string | null): string {
  if (!dateStr) return '';
  return formatDateTimeBR(dateStr, 'dd/MM/yyyy HH:mm');
}

function generateHotmartCSV(transactions: HotmartTransaction[]): string {
  const headers = [
    'Código Transação', 'Produto', 'Cliente', 'Email', 'Telefone', 'Moeda', 'País',
    'Valor', 'Data Compra', 'Tipo Cobrança', 'Método Pagamento',
  ];
  const rows = transactions.map((t) => [
    escapeCSV(t.transaction_code), escapeCSV(t.product), escapeCSV(t.buyer_name),
    escapeCSV(t.buyer_email), escapeCSV(t.buyer_phone), escapeCSV(t.currency), escapeCSV(t.country),
    escapeCSV(t.computed_value), escapeCSV(formatDateForExport(t.purchase_date)),
    escapeCSV(t.billing_type), escapeCSV(t.payment_method),
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function generateTmbCSV(transactions: TmbTransaction[]): string {
  const headers = [
    'ID Pedido', 'Produto', 'Cliente', 'Email', 'Valor', 'Data',
    'UTM Source', 'UTM Medium', 'UTM Campaign',
  ];
  const rows = transactions.map((t) => [
    escapeCSV(t.order_id), escapeCSV(t.product), escapeCSV(t.buyer_name),
    escapeCSV(t.buyer_email), escapeCSV(t.ticket_value),
    escapeCSV(formatDateForExport(t.effective_date)),
    escapeCSV(t.utm_source), escapeCSV(t.utm_medium), escapeCSV(t.utm_campaign),
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function generateEduzzCSV(transactions: EduzzTransaction[]): string {
  const headers = [
    'ID Venda', 'Produto', 'Cliente', 'Email', 'Valor', 'Moeda',
    'Data Venda', 'Status', 'Método Pagamento', 'UTM Source',
  ];
  const rows = transactions.map((t) => [
    escapeCSV(t.sale_id), escapeCSV(t.product), escapeCSV(t.buyer_name),
    escapeCSV(t.buyer_email), escapeCSV(t.sale_value), escapeCSV(t.currency),
    escapeCSV(formatDateForExport(t.sale_date)),
    escapeCSV(t.status), escapeCSV(t.payment_method), escapeCSV(t.utm_source),
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function generateCombinedCSV(
  hotmartTransactions: HotmartTransaction[],
  tmbTransactions: TmbTransaction[],
  eduzzTransactions: EduzzTransaction[]
): string {
  const headers = ['Plataforma', 'ID/Código', 'Produto', 'Cliente', 'Email', 'Valor', 'Moeda', 'Data'];

  const hotmartRows = hotmartTransactions.map((t) => ({
    platform: 'Hotmart', id: t.transaction_code, product: t.product,
    client: t.buyer_name, email: t.buyer_email, value: t.computed_value,
    currency: t.currency, date: t.purchase_date,
  }));
  const tmbRows = tmbTransactions.map((t) => ({
    platform: 'TMB', id: t.order_id, product: t.product,
    client: t.buyer_name, email: t.buyer_email, value: t.ticket_value,
    currency: 'BRL', date: t.effective_date,
  }));
  const eduzzRows = eduzzTransactions.map((t) => ({
    platform: 'Eduzz', id: t.sale_id, product: t.product,
    client: t.buyer_name, email: t.buyer_email, value: t.sale_value,
    currency: t.currency || 'BRL', date: t.sale_date,
  }));

  const allRows = [...hotmartRows, ...tmbRows, ...eduzzRows].sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    return dateB.localeCompare(dateA);
  });

  const csvRows = allRows.map((r) => [
    escapeCSV(r.platform), escapeCSV(r.id), escapeCSV(r.product),
    escapeCSV(r.client), escapeCSV(r.email), escapeCSV(r.value),
    escapeCSV(r.currency), escapeCSV(formatDateForExport(r.date)),
  ]);

  return [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
}

function downloadCSV(content: string, filename: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateCsvReport(data: CsvExportData, options: CsvExportOptions): void {
  const dateStr = format(new Date(), 'dd-MM-yyyy', { locale: ptBR });
  const clientSlug = options.clientName ? `-${options.clientName.toLowerCase().replace(/\s+/g, '-')}` : '';
  
  let periodStr = '';
  if (options.dateRange?.start && options.dateRange?.end) {
    const startStr = format(options.dateRange.start, 'ddMMyyyy');
    const endStr = format(options.dateRange.end, 'ddMMyyyy');
    periodStr = `-${startStr}-${endStr}`;
  }

  const filesGenerated: { name: string; content: string }[] = [];

  if (options.includeHotmart && data.hotmartTransactions.length > 0) {
    filesGenerated.push({
      name: `hotmart${clientSlug}${periodStr}-${dateStr}.csv`,
      content: generateHotmartCSV(data.hotmartTransactions),
    });
  }

  if (options.includeTmb && data.tmbTransactions.length > 0) {
    filesGenerated.push({
      name: `tmb${clientSlug}${periodStr}-${dateStr}.csv`,
      content: generateTmbCSV(data.tmbTransactions),
    });
  }

  if (options.includeEduzz && data.eduzzTransactions.length > 0) {
    filesGenerated.push({
      name: `eduzz${clientSlug}${periodStr}-${dateStr}.csv`,
      content: generateEduzzCSV(data.eduzzTransactions),
    });
  }

  if (options.includeCombined) {
    filesGenerated.push({
      name: `consolidado${clientSlug}${periodStr}-${dateStr}.csv`,
      content: generateCombinedCSV(data.hotmartTransactions, data.tmbTransactions, data.eduzzTransactions),
    });
  }

  filesGenerated.forEach((file) => {
    downloadCSV(file.content, file.name);
  });
}
