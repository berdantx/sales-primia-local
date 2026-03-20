import jsPDF from 'jspdf';
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

interface PdfExportOptions {
  includeHotmart: boolean;
  includeTmb: boolean;
  includeEduzz: boolean;
  includeSummary: boolean;
  includeCombined: boolean;
  dateRange: { start: Date; end: Date } | null;
  clientName?: string;
}

interface PdfExportData {
  hotmartTransactions: HotmartTransaction[];
  tmbTransactions: TmbTransaction[];
  eduzzTransactions: EduzzTransaction[];
  hotmartStats: { totalBRL: number; totalUSD: number; totalTransactions: number };
  tmbStats: { totalBRL: number; totalTransactions: number };
  eduzzStats: { totalBRL: number; totalTransactions: number };
}

function formatCurrencyBR(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.substring(0, max - 2) + '..' : str;
}

export function generatePdfReport(data: PdfExportData, options: PdfExportOptions): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = 14;
  let y = 20;

  const addHeader = () => {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Vendas', margin, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}`, margin, y);
    y += 5;

    if (options.clientName) {
      doc.text(`Cliente: ${options.clientName}`, margin, y);
      y += 5;
    }

    if (options.dateRange?.start && options.dateRange?.end) {
      const periodStr = `${format(options.dateRange.start, 'dd/MM/yyyy')} - ${format(options.dateRange.end, 'dd/MM/yyyy')}`;
      doc.text(`Período: ${periodStr}`, margin, y);
      y += 5;
    }

    doc.setTextColor(0);
    y += 4;
  };

  const checkNewPage = (needed: number) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needed > pageHeight - 15) {
      doc.addPage();
      y = 15;
    }
  };

  const drawTableRow = (cols: string[], colWidths: number[], isHeader: boolean) => {
    const rowHeight = 7;
    checkNewPage(rowHeight + 2);

    if (isHeader) {
      doc.setFillColor(41, 128, 185);
      doc.rect(margin, y - 4.5, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
      doc.setTextColor(255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
    } else {
      doc.setTextColor(50);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
    }

    let x = margin;
    cols.forEach((col, i) => {
      doc.text(truncate(col, 35), x + 1.5, y - 0.5, { maxWidth: colWidths[i] - 3 });
      x += colWidths[i];
    });

    doc.setTextColor(0);
    y += rowHeight;
  };

  addHeader();

  // Summary section
  if (options.includeSummary) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Geral', margin, y);
    y += 7;

    const summaryColWidths = [50, 45, 45, 35, 45];
    drawTableRow(['Plataforma', 'Total BRL', 'Total USD', 'Transações', 'Ticket Médio'], summaryColWidths, true);

    const hotmartAvg = data.hotmartStats.totalTransactions > 0
      ? data.hotmartStats.totalBRL / data.hotmartStats.totalTransactions : 0;
    drawTableRow([
      'Hotmart', formatCurrencyBR(data.hotmartStats.totalBRL),
      `US$ ${data.hotmartStats.totalUSD.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      String(data.hotmartStats.totalTransactions), formatCurrencyBR(hotmartAvg),
    ], summaryColWidths, false);

    const tmbAvg = data.tmbStats.totalTransactions > 0
      ? data.tmbStats.totalBRL / data.tmbStats.totalTransactions : 0;
    drawTableRow([
      'TMB', formatCurrencyBR(data.tmbStats.totalBRL), '-',
      String(data.tmbStats.totalTransactions), formatCurrencyBR(tmbAvg),
    ], summaryColWidths, false);

    const eduzzAvg = data.eduzzStats.totalTransactions > 0
      ? data.eduzzStats.totalBRL / data.eduzzStats.totalTransactions : 0;
    drawTableRow([
      'Eduzz', formatCurrencyBR(data.eduzzStats.totalBRL), '-',
      String(data.eduzzStats.totalTransactions), formatCurrencyBR(eduzzAvg),
    ], summaryColWidths, false);

    y += 3;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const totalBRL = data.hotmartStats.totalBRL + data.tmbStats.totalBRL + data.eduzzStats.totalBRL;
    const totalTx = data.hotmartStats.totalTransactions + data.tmbStats.totalTransactions + data.eduzzStats.totalTransactions;
    doc.text(`Total BRL: ${formatCurrencyBR(totalBRL)}`, margin, y);
    doc.text(`Total Transações: ${totalTx}`, margin + 90, y);
    y += 10;
  }

  // Hotmart transactions
  if (options.includeHotmart && data.hotmartTransactions.length > 0) {
    checkNewPage(20);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Transações Hotmart (${data.hotmartTransactions.length})`, margin, y);
    y += 7;

    const colWidths = [28, 38, 30, 42, 28, 18, 26, 26, 26];
    drawTableRow(['Código', 'Produto', 'Cliente', 'Email', 'Telefone', 'Moeda', 'Valor', 'Data', 'Tipo'], colWidths, true);

    data.hotmartTransactions.forEach((t) => {
      drawTableRow([
        t.transaction_code || '', t.product || '', t.buyer_name || '', t.buyer_email || '',
        t.buyer_phone || '', t.currency || '', formatCurrencyBR(t.computed_value),
        t.purchase_date ? formatDateTimeBR(t.purchase_date, 'dd/MM/yy') : '',
        t.billing_type || '',
      ], colWidths, false);
    });
    y += 8;
  }

  // TMB transactions
  if (options.includeTmb && data.tmbTransactions.length > 0) {
    checkNewPage(20);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Transações TMB (${data.tmbTransactions.length})`, margin, y);
    y += 7;

    const colWidths = [30, 45, 35, 45, 28, 30, 30, 25];
    drawTableRow(['Pedido', 'Produto', 'Cliente', 'Email', 'Telefone', 'Valor', 'Data', 'UTM'], colWidths, true);

    data.tmbTransactions.forEach((t) => {
      drawTableRow([
        t.order_id || '', t.product || '', t.buyer_name || '', t.buyer_email || '',
        t.buyer_phone || '', formatCurrencyBR(t.ticket_value),
        t.effective_date ? formatDateTimeBR(t.effective_date, 'dd/MM/yy') : '',
        t.utm_source || '',
      ], colWidths, false);
    });
    y += 8;
  }

  // Eduzz transactions
  if (options.includeEduzz && data.eduzzTransactions.length > 0) {
    checkNewPage(20);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Transações Eduzz (${data.eduzzTransactions.length})`, margin, y);
    y += 7;

    const colWidths = [26, 43, 34, 47, 26, 26, 26, 37];
    drawTableRow(['ID Venda', 'Produto', 'Cliente', 'Email', 'Valor', 'Data', 'Status', 'UTM Source'], colWidths, true);

    data.eduzzTransactions.forEach((t) => {
      drawTableRow([
        t.sale_id || '', t.product || '', t.buyer_name || '', t.buyer_email || '',
        formatCurrencyBR(t.sale_value),
        t.sale_date ? formatDateTimeBR(t.sale_date, 'dd/MM/yy') : '',
        t.status || '', t.utm_source || '',
      ], colWidths, false);
    });
    y += 8;
  }

  // Generate filename
  const dateStr = format(new Date(), 'dd-MM-yyyy', { locale: ptBR });
  let fileName = 'relatorio-vendas';
  if (options.clientName) {
    fileName += `-${options.clientName.toLowerCase().replace(/\s+/g, '-')}`;
  }
  if (options.dateRange?.start && options.dateRange?.end) {
    fileName += `-${format(options.dateRange.start, 'ddMMyyyy')}-${format(options.dateRange.end, 'ddMMyyyy')}`;
  }
  fileName += `-${dateStr}.pdf`;

  doc.save(fileName);
}
