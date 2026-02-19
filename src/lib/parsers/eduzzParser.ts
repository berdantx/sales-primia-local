import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface EduzzTransaction {
  sale_id: string;
  invoice_code: string;
  product: string;
  product_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  sale_value: number;
  currency: string;
  sale_date: Date | null;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  total_installments: number | null;
  payment_method: string;
  payment_form: string;
}

export interface EduzzParseResult {
  transactions: EduzzTransaction[];
  errors: EduzzParseError[];
  totalRows: number;
  duplicates: string[];
}

export interface EduzzParseError {
  row: number;
  type: 'missing_field' | 'invalid_value' | 'parse_error';
  message: string;
  rawData?: Record<string, unknown>;
}

// Eduzz column mappings (Portuguese headers)
const EDUZZ_COLUMNS = {
  saleId: ['fatura', 'código da venda', 'codigo da venda', 'id venda', 'sale_id', 'código', 'codigo', 'id', 'id_venda'],
  invoiceCode: ['código fatura', 'codigo fatura', 'invoice_code', 'nf', 'nota fiscal'],
  product: ['produto', 'nome do produto', 'product', 'conteudo', 'conteúdo'],
  productId: ['id do produto', 'id produto', 'product_id', 'id_produto', 'codigo produto'],
  buyerName: ['cliente / nome', 'nome', 'cliente', 'comprador', 'buyer_name', 'nome do cliente', 'nome completo'],
  buyerEmail: ['cliente / e-mail', 'email', 'e-mail', 'buyer_email', 'email do cliente'],
  buyerPhone: ['cliente / fones', 'fones', 'telefone', 'phone', 'celular', 'telefone do cliente'],
  saleValue: ['valor da venda', 'valor líquido', 'valor liquido', 'sale_value', 'valor venda', 'valor final', 'total'],
  saleDate: ['data de pagamento', 'data do pagamento', 'data da venda', 'data venda', 'sale_date', 'data', 'data compra', 'data da compra'],
  utmSource: ['utm_source', 'source', 'origem'],
  utmMedium: ['utm_medium', 'medium', 'mídia', 'midia'],
  utmCampaign: ['utm_campaign', 'campaign', 'campanha'],
  utmContent: ['utm_content', 'content', 'conteúdo utm'],
  totalInstallments: ['no parcelas', 'n parcelas', 'parcelas', 'nº parcelas', 'total_installments', 'numero de parcelas'],
  paymentMethod: ['forma de pagamento', 'payment_method', 'forma pagamento', 'metodo pagamento'],
  paymentForm: ['metodo de pagamento', 'método de pagamento', 'payment_form', 'bandeira', 'tipo cartao'],
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function findColumn(headers: string[], possibleNames: string[]): string | null {
  const normalizedHeaders = headers.map(normalizeHeader);
  
  // First: exact match
  for (const name of possibleNames) {
    const normalizedName = normalizeHeader(name);
    const exactIndex = normalizedHeaders.findIndex(h => h === normalizedName);
    if (exactIndex !== -1) {
      return headers[exactIndex];
    }
  }
  
  // Second: partial match
  for (const name of possibleNames) {
    const normalizedName = normalizeHeader(name);
    const index = normalizedHeaders.findIndex(h => 
      h.includes(normalizedName) || normalizedName.includes(h)
    );
    if (index !== -1) {
      return headers[index];
    }
  }
  return null;
}

function parseNumber(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 0;
  
  const strValue = String(value).trim();
  
  // Remove currency symbols and spaces
  const cleanValue = strValue.replace(/[R$\s]/g, '');
  
  // If has comma AND period, it's BR format: 1.234,56
  if (cleanValue.includes(',') && cleanValue.includes('.')) {
    return parseFloat(cleanValue.replace(/\./g, '').replace(',', '.')) || 0;
  }
  
  // If has only comma, comma is decimal: 1234,56
  if (cleanValue.includes(',')) {
    return parseFloat(cleanValue.replace(',', '.')) || 0;
  }
  
  // If has only period, period is decimal: 1234.56
  return parseFloat(cleanValue) || 0;
}

function parseDate(value: string | number | undefined): Date | null {
  if (value === undefined || value === null || value === '') return null;
  
  const strValue = String(value).trim();
  if (!strValue) return null;
  
  // DD/MM/YYYY HH:MM:SS format
  const brDateTimeMatch = strValue.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})[\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  if (brDateTimeMatch) {
    const [, dayOrMonth1, dayOrMonth2, year, hours, minutes, seconds = '0'] = brDateTimeMatch;
    let day: number, month: number;
    const val1 = parseInt(dayOrMonth1);
    const val2 = parseInt(dayOrMonth2);
    
    if (val1 > 12) {
      day = val1;
      month = val2;
    } else if (val2 > 12) {
      day = val2;
      month = val1;
    } else {
      // Both <= 12, assume DD/MM (Brazilian format)
      day = val1;
      month = val2;
    }
    
    const date = new Date(parseInt(year), month - 1, day, parseInt(hours), parseInt(minutes), parseInt(seconds));
    if (!isNaN(date.getTime()) && date.getDate() === day) return date;
  }
  
  // DD/MM/YYYY or DD-MM-YYYY
  const brDateMatch = strValue.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brDateMatch) {
    const [, dayOrMonth1, dayOrMonth2, year] = brDateMatch;
    let day: number, month: number;
    const val1 = parseInt(dayOrMonth1);
    const val2 = parseInt(dayOrMonth2);
    
    if (val1 > 12) {
      day = val1;
      month = val2;
    } else if (val2 > 12) {
      day = val2;
      month = val1;
    } else {
      day = val1;
      month = val2;
    }
    
    const date = new Date(parseInt(year), month - 1, day);
    if (!isNaN(date.getTime()) && date.getDate() === day) return date;
  }
  
  // YYYY-MM-DD format
  const isoMatch = strValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
}

export function autoDetectEduzzColumns(headers: string[]): Record<string, string | null> {
  return {
    saleId: findColumn(headers, EDUZZ_COLUMNS.saleId),
    invoiceCode: findColumn(headers, EDUZZ_COLUMNS.invoiceCode),
    product: findColumn(headers, EDUZZ_COLUMNS.product),
    productId: findColumn(headers, EDUZZ_COLUMNS.productId),
    buyerName: findColumn(headers, EDUZZ_COLUMNS.buyerName),
    buyerEmail: findColumn(headers, EDUZZ_COLUMNS.buyerEmail),
    buyerPhone: findColumn(headers, EDUZZ_COLUMNS.buyerPhone),
    saleValue: findColumn(headers, EDUZZ_COLUMNS.saleValue),
    saleDate: findColumn(headers, EDUZZ_COLUMNS.saleDate),
    utmSource: findColumn(headers, EDUZZ_COLUMNS.utmSource),
    utmMedium: findColumn(headers, EDUZZ_COLUMNS.utmMedium),
    utmCampaign: findColumn(headers, EDUZZ_COLUMNS.utmCampaign),
    utmContent: findColumn(headers, EDUZZ_COLUMNS.utmContent),
    totalInstallments: findColumn(headers, EDUZZ_COLUMNS.totalInstallments),
    paymentMethod: findColumn(headers, EDUZZ_COLUMNS.paymentMethod),
    paymentForm: findColumn(headers, EDUZZ_COLUMNS.paymentForm),
  };
}

export function parseEduzzData(data: Record<string, unknown>[], headers: string[], customColumnMap?: Record<string, string | null>): EduzzParseResult {
  const transactions: EduzzTransaction[] = [];
  const errors: EduzzParseError[] = [];
  const duplicates: string[] = [];
  
  
  // Find column mappings - use custom map if provided
  const columnMap = customColumnMap ? {
    saleId: customColumnMap.saleId || null,
    invoiceCode: customColumnMap.invoiceCode || null,
    product: customColumnMap.product || null,
    productId: customColumnMap.productId || null,
    buyerName: customColumnMap.buyerName || null,
    buyerEmail: customColumnMap.buyerEmail || null,
    buyerPhone: customColumnMap.buyerPhone || null,
    saleValue: customColumnMap.saleValue || null,
    saleDate: customColumnMap.saleDate || null,
    utmSource: customColumnMap.utmSource || null,
    utmMedium: customColumnMap.utmMedium || null,
    utmCampaign: customColumnMap.utmCampaign || null,
    utmContent: customColumnMap.utmContent || null,
    totalInstallments: customColumnMap.totalInstallments || null,
    paymentMethod: customColumnMap.paymentMethod || null,
    paymentForm: customColumnMap.paymentForm || null,
  } : autoDetectEduzzColumns(headers);
  
  // Check required columns
  if (!columnMap.saleId) {
    errors.push({
      row: 0,
      type: 'missing_field',
      message: 'Coluna "Código da venda" ou "ID" não encontrada',
    });
  }
  
  if (!columnMap.saleValue) {
    errors.push({
      row: 0,
      type: 'missing_field',
      message: 'Coluna "Valor" ou "Valor Líquido" não encontrada',
    });
  }
  
  // First pass: parse all rows and group by saleId (keep best per group)
  const groupedBySaleId = new Map<string, { transaction: EduzzTransaction; rowNum: number }>();
  
  data.forEach((row, index) => {
    const rowNum = index + 2; // Account for header row
    
    try {
      const saleId = columnMap.saleId 
        ? String(row[columnMap.saleId] || '').trim()
        : '';
      
      if (!saleId) {
        errors.push({
          row: rowNum,
          type: 'missing_field',
          message: 'ID da venda não encontrado',
          rawData: row,
        });
        return;
      }
      
      const transaction: EduzzTransaction = {
        sale_id: saleId,
        invoice_code: columnMap.invoiceCode ? String(row[columnMap.invoiceCode] || '').trim() : '',
        product: columnMap.product ? String(row[columnMap.product] || '').trim() : '',
        product_id: columnMap.productId ? String(row[columnMap.productId] || '').trim() : '',
        buyer_name: columnMap.buyerName ? String(row[columnMap.buyerName] || '').trim() : '',
        buyer_email: columnMap.buyerEmail ? String(row[columnMap.buyerEmail] || '').trim() : '',
        buyer_phone: columnMap.buyerPhone ? String(row[columnMap.buyerPhone] || '').trim() : '',
        sale_value: parseNumber(
          columnMap.saleValue ? row[columnMap.saleValue] as string : undefined
        ),
        currency: 'BRL',
        sale_date: parseDate(
          columnMap.saleDate ? (row[columnMap.saleDate] as string | number | undefined) : undefined
        ),
        utm_source: columnMap.utmSource ? String(row[columnMap.utmSource] || '').trim() : '',
        utm_medium: columnMap.utmMedium ? String(row[columnMap.utmMedium] || '').trim() : '',
        utm_campaign: columnMap.utmCampaign ? String(row[columnMap.utmCampaign] || '').trim() : '',
        utm_content: columnMap.utmContent ? String(row[columnMap.utmContent] || '').trim() : '',
        total_installments: columnMap.totalInstallments 
          ? (parseInt(String(row[columnMap.totalInstallments] || ''), 10) || null)
          : null,
        payment_method: columnMap.paymentMethod ? String(row[columnMap.paymentMethod] || '').trim() : '',
        payment_form: columnMap.paymentForm ? String(row[columnMap.paymentForm] || '').trim() : '',
      };
      
      const existing = groupedBySaleId.get(saleId);
      if (existing) {
        // Keep the row with the highest sale_value (Produtor > Co-produtor)
        duplicates.push(saleId);
        if (transaction.sale_value > existing.transaction.sale_value) {
          groupedBySaleId.set(saleId, { transaction, rowNum });
        }
      } else {
        groupedBySaleId.set(saleId, { transaction, rowNum });
      }
    } catch (error) {
      errors.push({
        row: rowNum,
        type: 'parse_error',
        message: `Erro ao processar linha: ${error}`,
        rawData: row,
      });
    }
  });
  
  // Second pass: collect winning transactions
  for (const { transaction } of groupedBySaleId.values()) {
    transactions.push(transaction);
  }
  
  return {
    transactions,
    errors,
    totalRows: data.length,
    duplicates,
  };
}

export async function parseEduzzCSV(file: File): Promise<{ data: Record<string, unknown>[]; headers: string[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        resolve({ data: results.data as Record<string, unknown>[], headers });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

export async function parseEduzzXLSX(file: File): Promise<{ data: Record<string, unknown>[]; headers: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet) as Record<string, unknown>[];
        const headers = Object.keys(jsonData[0] || {});
        resolve({ data: jsonData, headers });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

export async function parseEduzzFile(file: File): Promise<EduzzParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  let result: { data: Record<string, unknown>[]; headers: string[] };
  
  if (extension === 'csv') {
    result = await parseEduzzCSV(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    result = await parseEduzzXLSX(file);
  } else {
    throw new Error('Eduzz suporta apenas arquivos CSV ou XLSX');
  }
  
  return parseEduzzData(result.data, result.headers);
}
