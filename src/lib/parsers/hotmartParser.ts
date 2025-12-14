import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface HotmartTransaction {
  transaction_code: string;
  product: string;
  currency: string;
  country: string;
  gross_value_with_taxes: number;
  sck_code: string;
  payment_method: string;
  total_installments: number;
  billing_type: string;
  computed_value: number;
  buyer_name: string;
  buyer_email: string;
  purchase_date: Date | null;
}

export interface ParseResult {
  transactions: HotmartTransaction[];
  errors: ParseError[];
  totalRows: number;
  duplicates: string[];
}

export interface ParseError {
  row: number;
  type: 'missing_field' | 'invalid_value' | 'parse_error';
  message: string;
  rawData?: Record<string, unknown>;
}

// Hotmart column mappings (Portuguese headers)
const HOTMART_COLUMNS = {
  transactionCode: ['código da transação', 'codigo da transacao', 'transaction_code', 'código transação'],
  product: ['produto', 'product', 'nome do produto'],
  currency: ['moeda', 'currency', 'moeda da transação'],
  country: ['país', 'pais', 'country', 'país do comprador'],
  grossValue: ['valor de compra com impostos', 'valor com impostos', 'gross_value', 'valor'],
  grossValueNoTax: ['faturamento bruto (sem impostos)', 'faturamento bruto sem impostos', 'faturamento bruto', 'gross_revenue', 'gross revenue'],
  sckCode: ['código sck', 'codigo sck', 'sck_code', 'sck'],
  paymentMethod: ['método de pagamento', 'metodo de pagamento', 'payment_method', 'forma de pagamento'],
  totalInstallments: ['quantidade total de parcelas', 'total de parcelas', 'parcelas', 'installments'],
  billingType: ['tipo de cobrança', 'tipo de cobranca', 'billing_type', 'tipo cobrança'],
  buyerName: ['comprador', 'buyer_name', 'nome do comprador', 'cliente'],
  buyerEmail: ['e-mail', 'email', 'buyer_email', 'email do comprador'],
  purchaseDate: [
    'data da transação', 'data da transacao', 'data transação', 'data transacao', 'transaction_date',
    'data da compra', 'data compra', 'purchase_date', 'data', 
    'data de compra', 'data da venda', 'data venda', 'created_at',
    'data pedido', 'data do pedido', 'order_date', 'purchase date'
  ],
};

// Map country to currency
function getCurrencyFromCountry(country: string): string {
  const countryLower = country.toLowerCase().trim();
  
  const currencyMap: Record<string, string> = {
    // Americas
    'brasil': 'BRL',
    'brazil': 'BRL',
    'estados unidos': 'USD',
    'united states': 'USD',
    'usa': 'USD',
    'eua': 'USD',
    'canadá': 'CAD',
    'canada': 'CAD',
    'méxico': 'MXN',
    'mexico': 'MXN',
    'argentina': 'ARS',
    'chile': 'CLP',
    'colômbia': 'COP',
    'colombia': 'COP',
    'peru': 'PEN',
    'paraguai': 'PYG',
    'paraguay': 'PYG',
    'uruguai': 'UYU',
    'uruguay': 'UYU',
    
    // Europe
    'portugal': 'EUR',
    'espanha': 'EUR',
    'spain': 'EUR',
    'frança': 'EUR',
    'france': 'EUR',
    'alemanha': 'EUR',
    'germany': 'EUR',
    'itália': 'EUR',
    'italy': 'EUR',
    'holanda': 'EUR',
    'netherlands': 'EUR',
    'bélgica': 'EUR',
    'belgium': 'EUR',
    'áustria': 'EUR',
    'austria': 'EUR',
    'irlanda': 'EUR',
    'ireland': 'EUR',
    'reino unido': 'GBP',
    'united kingdom': 'GBP',
    'uk': 'GBP',
    'suíça': 'CHF',
    'switzerland': 'CHF',
    
    // Asia/Oceania
    'japão': 'JPY',
    'japan': 'JPY',
    'austrália': 'AUD',
    'australia': 'AUD',
    'nova zelândia': 'NZD',
    'new zealand': 'NZD',
  };
  
  return currencyMap[countryLower] || 'USD'; // Default to USD for unknown countries
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function findColumn(headers: string[], possibleNames: string[]): string | null {
  const normalizedHeaders = headers.map(normalizeHeader);
  for (const name of possibleNames) {
    const normalizedName = normalizeHeader(name);
    const index = normalizedHeaders.findIndex(h => h.includes(normalizedName) || normalizedName.includes(h));
    if (index !== -1) {
      return headers[index];
    }
  }
  return null;
}

function parseNumber(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  
  // Handle Brazilian number format (1.234,56 -> 1234.56)
  let cleaned = value.toString().trim();
  
  // Check if it uses comma as decimal separator
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Format: 1.234,56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    // Format: 1234,56
    cleaned = cleaned.replace(',', '.');
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDate(value: string | number | undefined): Date | null {
  if (value === undefined || value === null || value === '') return null;
  
  const strValue = String(value).trim();
  if (!strValue) return null;
  
  // Handle Excel serial date numbers first
  if (typeof value === 'number') {
    // Excel dates are days since 1899-12-30 (with a bug for 1900)
    if (value > 1 && value < 100000) {
      const date = new Date((value - 25569) * 86400 * 1000);
      if (!isNaN(date.getTime())) return date;
    }
  }
  
  // DD/MM/YYYY HH:MM:SS or DD/MM/YYYY HH:MM (with optional space variations)
  const brDateTimeMatch = strValue.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})[\s\-]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  if (brDateTimeMatch) {
    const [, dayOrMonth1, dayOrMonth2, year, hours, minutes, seconds = '0'] = brDateTimeMatch;
    // Detect if it's DD/MM or MM/DD based on which value > 12
    let day: number, month: number;
    const val1 = parseInt(dayOrMonth1);
    const val2 = parseInt(dayOrMonth2);
    
    if (val1 > 12) {
      // val1 must be day (DD/MM format)
      day = val1;
      month = val2;
    } else if (val2 > 12) {
      // val2 must be day (MM/DD format) - unlikely for Brazilian data
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
  
  // DD/MM/YYYY or DD-MM-YYYY (most common in Hotmart exports)
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
      // Both <= 12, assume DD/MM (Brazilian format)
      day = val1;
      month = val2;
    }
    
    const date = new Date(parseInt(year), month - 1, day);
    if (!isNaN(date.getTime()) && date.getDate() === day) return date;
  }
  
  // YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS (ISO format)
  const isoMatch = strValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (isoMatch) {
    const [, year, month, day, hours = '0', minutes = '0', seconds = '0'] = isoMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds));
    if (!isNaN(date.getTime())) return date;
  }
  
  // YYYY/MM/DD format
  const isoSlashMatch = strValue.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (isoSlashMatch) {
    const [, year, month, day] = isoSlashMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  // DO NOT use native Date parsing as fallback - it interprets DD/MM as MM/DD
  // which causes days > 12 to fail silently
  return null;
}

function parseInteger(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 1;
  if (typeof value === 'number') return Math.round(value);
  
  const num = parseInt(value.toString().trim(), 10);
  return isNaN(num) ? 1 : num;
}

export function parseHotmartData(data: Record<string, unknown>[], headers: string[]): ParseResult {
  const transactions: HotmartTransaction[] = [];
  const errors: ParseError[] = [];
  const seenCodes = new Set<string>();
  const duplicates: string[] = [];
  
  // Find column mappings
  const columnMap = {
    transactionCode: findColumn(headers, HOTMART_COLUMNS.transactionCode),
    product: findColumn(headers, HOTMART_COLUMNS.product),
    currency: findColumn(headers, HOTMART_COLUMNS.currency),
    country: findColumn(headers, HOTMART_COLUMNS.country),
    grossValue: findColumn(headers, HOTMART_COLUMNS.grossValue),
    grossValueNoTax: findColumn(headers, HOTMART_COLUMNS.grossValueNoTax),
    sckCode: findColumn(headers, HOTMART_COLUMNS.sckCode),
    paymentMethod: findColumn(headers, HOTMART_COLUMNS.paymentMethod),
    totalInstallments: findColumn(headers, HOTMART_COLUMNS.totalInstallments),
    billingType: findColumn(headers, HOTMART_COLUMNS.billingType),
    buyerName: findColumn(headers, HOTMART_COLUMNS.buyerName),
    buyerEmail: findColumn(headers, HOTMART_COLUMNS.buyerEmail),
    purchaseDate: findColumn(headers, HOTMART_COLUMNS.purchaseDate),
  };
  
  // Check required columns
  if (!columnMap.transactionCode) {
    errors.push({
      row: 0,
      type: 'missing_field',
      message: 'Coluna "Código da transação" não encontrada',
    });
  }
  
  data.forEach((row, index) => {
    const rowNum = index + 2; // Account for header row
    
    try {
      const transactionCode = columnMap.transactionCode 
        ? String(row[columnMap.transactionCode] || '').trim()
        : '';
      
      if (!transactionCode) {
        errors.push({
          row: rowNum,
          type: 'missing_field',
          message: 'Código da transação não encontrado',
          rawData: row,
        });
        return;
      }
      
      // Check for duplicates
      if (seenCodes.has(transactionCode)) {
        duplicates.push(transactionCode);
        return;
      }
      seenCodes.add(transactionCode);
      
      // Get country first to determine which value column to use
      const country = columnMap.country ? String(row[columnMap.country] || '').trim() : '';
      const isBrazil = country.toLowerCase() === 'brasil' || country.toLowerCase() === 'brazil' || country === '';
      
      // For Brazil: use "valor de compra com impostos"
      // For other countries: use "faturamento bruto (sem impostos)"
      let grossValue: number;
      if (isBrazil) {
        grossValue = parseNumber(
          columnMap.grossValue ? row[columnMap.grossValue] as string : undefined
        );
      } else {
        // For international sales, prefer grossValueNoTax, fallback to grossValue
        const noTaxValue = columnMap.grossValueNoTax 
          ? parseNumber(row[columnMap.grossValueNoTax] as string)
          : 0;
        const withTaxValue = columnMap.grossValue 
          ? parseNumber(row[columnMap.grossValue] as string)
          : 0;
        grossValue = noTaxValue > 0 ? noTaxValue : withTaxValue;
      }
      
      const totalInstallments = parseInteger(
        columnMap.totalInstallments ? row[columnMap.totalInstallments] as string : undefined
      );
      const billingType = columnMap.billingType 
        ? String(row[columnMap.billingType] || '').trim()
        : '';
      
      // Apply "Recuperador inteligente" rule
      let computedValue = grossValue;
      if (billingType.toLowerCase().includes('recuperador inteligente')) {
        computedValue = grossValue * totalInstallments;
      }
      
      // Determine currency based on country (not from column)
      // For Brazil: BRL
      // For other countries: infer from country
      let currency: string;
      if (isBrazil) {
        currency = 'BRL';
      } else {
        currency = getCurrencyFromCountry(country);
      }
      
      const transaction: HotmartTransaction = {
        transaction_code: transactionCode,
        product: columnMap.product ? String(row[columnMap.product] || '').trim() : '',
        currency: currency,
        country: country,
        gross_value_with_taxes: grossValue,
        sck_code: columnMap.sckCode ? String(row[columnMap.sckCode] || '').trim() : '',
        payment_method: columnMap.paymentMethod ? String(row[columnMap.paymentMethod] || '').trim() : '',
        total_installments: totalInstallments,
        billing_type: billingType,
        computed_value: computedValue,
        buyer_name: columnMap.buyerName ? String(row[columnMap.buyerName] || '').trim() : '',
        buyer_email: columnMap.buyerEmail ? String(row[columnMap.buyerEmail] || '').trim() : '',
        purchase_date: parseDate(
          columnMap.purchaseDate ? (row[columnMap.purchaseDate] as string | number | undefined) : undefined
        ),
      };
      
      transactions.push(transaction);
    } catch (error) {
      errors.push({
        row: rowNum,
        type: 'parse_error',
        message: `Erro ao processar linha: ${error}`,
        rawData: row,
      });
    }
  });
  
  return {
    transactions,
    errors,
    totalRows: data.length,
    duplicates,
  };
}

export async function parseCSV(file: File): Promise<{ data: Record<string, unknown>[]; headers: string[] }> {
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

export async function parseXLSX(file: File): Promise<{ data: Record<string, unknown>[]; headers: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet) as Record<string, unknown>[];
        
        const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
        
        resolve({ data: jsonData, headers });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsBinaryString(file);
  });
}

export async function parseFile(file: File): Promise<ParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  let data: Record<string, unknown>[];
  let headers: string[];
  
  if (extension === 'csv') {
    const result = await parseCSV(file);
    data = result.data;
    headers = result.headers;
  } else if (extension === 'xlsx' || extension === 'xls') {
    const result = await parseXLSX(file);
    data = result.data;
    headers = result.headers;
  } else {
    throw new Error('Formato de arquivo não suportado. Use CSV ou XLSX.');
  }
  
  return parseHotmartData(data, headers);
}
