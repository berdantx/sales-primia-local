import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateTimeBR } from '@/lib/dateUtils';

interface HotmartTransaction {
  transaction_code: string;
  product: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
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
  sale_value: number;
  sale_date: string | null;
  status: string;
  payment_method: string | null;
  currency: string | null;
}

interface ExportOptions {
  includeHotmart: boolean;
  includeTmb: boolean;
  includeEduzz: boolean;
  includeSummary: boolean;
  includeCombined: boolean;
  dateRange: { start: Date; end: Date } | null;
  clientName?: string;
}

interface ExportData {
  hotmartTransactions: HotmartTransaction[];
  tmbTransactions: TmbTransaction[];
  eduzzTransactions: EduzzTransaction[];
  hotmartStats: { totalBRL: number; totalUSD: number; totalTransactions: number };
  tmbStats: { totalBRL: number; totalTransactions: number };
  eduzzStats: { totalBRL: number; totalTransactions: number };
}

export function generateExcelReport(data: ExportData, options: ExportOptions): void {
  const workbook = XLSX.utils.book_new();
  const dateStr = format(new Date(), 'dd-MM-yyyy', { locale: ptBR });

  // Summary Sheet
  if (options.includeSummary) {
    const summaryData: (string | number)[][] = [
      ['RELATÓRIO CONSOLIDADO DE VENDAS'],
      ['Data de Geração:', format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })],
    ];

    if (options.clientName) {
      summaryData.push(['Cliente:', options.clientName]);
    }

    if (options.dateRange?.start && options.dateRange?.end) {
      const periodStr = `${format(options.dateRange.start, 'dd/MM/yyyy', { locale: ptBR })} - ${format(options.dateRange.end, 'dd/MM/yyyy', { locale: ptBR })}`;
      summaryData.push(['Período:', periodStr]);
    }

    summaryData.push(
      [''],
      ['RESUMO GERAL'],
      ['Plataforma', 'Total BRL', 'Total USD', 'Transações', 'Ticket Médio'],
      [
        'Hotmart',
        data.hotmartStats.totalBRL,
        data.hotmartStats.totalUSD,
        data.hotmartStats.totalTransactions,
        data.hotmartStats.totalTransactions > 0 
          ? data.hotmartStats.totalBRL / data.hotmartStats.totalTransactions 
          : 0,
      ],
      [
        'TMB',
        data.tmbStats.totalBRL,
        0,
        data.tmbStats.totalTransactions,
        data.tmbStats.totalTransactions > 0 
          ? data.tmbStats.totalBRL / data.tmbStats.totalTransactions 
          : 0,
      ],
      [
        'Eduzz',
        data.eduzzStats.totalBRL,
        0,
        data.eduzzStats.totalTransactions,
        data.eduzzStats.totalTransactions > 0 
          ? data.eduzzStats.totalBRL / data.eduzzStats.totalTransactions 
          : 0,
      ],
      [''],
      ['TOTAL COMBINADO'],
      ['Total BRL:', data.hotmartStats.totalBRL + data.tmbStats.totalBRL + data.eduzzStats.totalBRL],
      ['Total USD:', data.hotmartStats.totalUSD],
      ['Total Transações:', data.hotmartStats.totalTransactions + data.tmbStats.totalTransactions + data.eduzzStats.totalTransactions]
    );

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [
      { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
  }

  // Hotmart Sheet
  if (options.includeHotmart && data.hotmartTransactions.length > 0) {
    const hotmartHeaders = [
      'Código Transação', 'Produto', 'Cliente', 'Email', 'Moeda', 'País', 'Valor', 'Data Compra', 'Tipo Cobrança', 'Método Pagamento',
    ];
    const hotmartRows = data.hotmartTransactions.map((t) => [
      t.transaction_code, t.product || '', t.buyer_name || '', t.buyer_email || '',
      t.currency, t.country || '', t.computed_value,
      t.purchase_date ? formatDateTimeBR(t.purchase_date, 'dd/MM/yyyy HH:mm') : '',
      t.billing_type || '', t.payment_method || '',
    ]);
    const hotmartSheet = XLSX.utils.aoa_to_sheet([hotmartHeaders, ...hotmartRows]);
    hotmartSheet['!cols'] = [
      { wch: 20 }, { wch: 30 }, { wch: 25 }, { wch: 30 }, { wch: 8 },
      { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(workbook, hotmartSheet, 'Hotmart');
  }

  // TMB Sheet
  if (options.includeTmb && data.tmbTransactions.length > 0) {
    const tmbHeaders = [
      'ID Pedido', 'Produto', 'Cliente', 'Email', 'Valor', 'Data', 'UTM Source', 'UTM Medium', 'UTM Campaign',
    ];
    const tmbRows = data.tmbTransactions.map((t) => [
      t.order_id, t.product || '', t.buyer_name || '', t.buyer_email || '',
      t.ticket_value,
      t.effective_date ? formatDateTimeBR(t.effective_date, 'dd/MM/yyyy HH:mm') : '',
      t.utm_source || '', t.utm_medium || '', t.utm_campaign || '',
    ]);
    const tmbSheet = XLSX.utils.aoa_to_sheet([tmbHeaders, ...tmbRows]);
    tmbSheet['!cols'] = [
      { wch: 20 }, { wch: 30 }, { wch: 25 }, { wch: 30 }, { wch: 15 },
      { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(workbook, tmbSheet, 'TMB');
  }

  // Eduzz Sheet
  if (options.includeEduzz && data.eduzzTransactions.length > 0) {
    const eduzzHeaders = [
      'ID Venda', 'Produto', 'Cliente', 'Email', 'Valor', 'Moeda', 'Data Venda', 'Status', 'Método Pagamento',
    ];
    const eduzzRows = data.eduzzTransactions.map((t) => [
      t.sale_id, t.product || '', t.buyer_name || '', t.buyer_email || '',
      t.sale_value, t.currency || 'BRL',
      t.sale_date ? formatDateTimeBR(t.sale_date, 'dd/MM/yyyy HH:mm') : '',
      t.status || '', t.payment_method || '',
    ]);
    const eduzzSheet = XLSX.utils.aoa_to_sheet([eduzzHeaders, ...eduzzRows]);
    eduzzSheet['!cols'] = [
      { wch: 15 }, { wch: 30 }, { wch: 25 }, { wch: 30 }, { wch: 15 },
      { wch: 8 }, { wch: 18 }, { wch: 15 }, { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(workbook, eduzzSheet, 'Eduzz');
  }

  // Combined Sheet
  if (options.includeCombined) {
    const combinedHeaders = ['Plataforma', 'ID/Código', 'Produto', 'Cliente', 'Email', 'Valor', 'Moeda', 'Data'];

    const hotmartCombined = data.hotmartTransactions.map((t) => [
      'Hotmart', t.transaction_code, t.product || '', t.buyer_name || '',
      t.buyer_email || '', t.computed_value, t.currency, t.purchase_date || '',
    ]);
    const tmbCombined = data.tmbTransactions.map((t) => [
      'TMB', t.order_id, t.product || '', t.buyer_name || '',
      t.buyer_email || '', t.ticket_value, 'BRL', t.effective_date || '',
    ]);
    const eduzzCombined = data.eduzzTransactions.map((t) => [
      'Eduzz', t.sale_id, t.product || '', t.buyer_name || '',
      t.buyer_email || '', t.sale_value, t.currency || 'BRL', t.sale_date || '',
    ]);

    const allCombined = [...hotmartCombined, ...tmbCombined, ...eduzzCombined]
      .sort((a, b) => {
        const dateA = a[7] as string;
        const dateB = b[7] as string;
        return dateB.localeCompare(dateA);
      })
      .map((row) => {
        const dateVal = row[7] as string;
        return [
          ...row.slice(0, 7),
          dateVal ? formatDateTimeBR(dateVal, 'dd/MM/yyyy HH:mm') : '',
        ];
      });

    const combinedSheet = XLSX.utils.aoa_to_sheet([combinedHeaders, ...allCombined]);
    combinedSheet['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 30 }, { wch: 25 },
      { wch: 30 }, { wch: 15 }, { wch: 8 }, { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(workbook, combinedSheet, 'Consolidado');
  }

  // Generate filename
  let fileName = 'relatorio-vendas';
  if (options.clientName) {
    fileName += `-${options.clientName.toLowerCase().replace(/\s+/g, '-')}`;
  }
  if (options.dateRange?.start && options.dateRange?.end) {
    const startStr = format(options.dateRange.start, 'ddMMyyyy');
    const endStr = format(options.dateRange.end, 'ddMMyyyy');
    fileName += `-${startStr}-${endStr}`;
  }
  fileName += `-${dateStr}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}
