import Papa from 'papaparse';

export interface TmbTransaction {
  order_id: string;
  product: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  ticket_value: number;
  currency: string;
  effective_date: Date | null;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
}

export interface TmbParseResult {
  transactions: TmbTransaction[];
  errors: TmbParseError[];
  totalRows: number;
  duplicates: string[];
}

export interface TmbParseError {
  row: number;
  type: 'missing_field' | 'invalid_value' | 'parse_error';
  message: string;
  rawData?: Record<string, unknown>;
}

// TMB column mappings (Portuguese headers)
const TMB_COLUMNS = {
  orderId: ['pedido', 'id pedido', 'order_id', 'id'],
  product: ['produto', 'product', 'nome do produto'],
  buyerName: ['cliente nome', 'cliente', 'nome', 'buyer_name', 'nome do cliente'],
  buyerEmail: ['cliente email', 'email', 'e-mail', 'buyer_email', 'email do cliente'],
  buyerPhone: ['telefone', 'celular', 'phone', 'telefones', 'telefone_ativo', 'buyer_phone', 'tel', 'whatsapp'],
  ticketValue: ['ticket (r$)', 'ticket', 'valor', 'ticket_value', 'valor do ticket'],
  effectiveDate: ['data efetivado', 'data efetivação', 'data', 'effective_date', 'data da compra'],
  utmSource: ['utm source', 'utm_source', 'source'],
  utmMedium: ['utm medium', 'utm_medium', 'medium'],
  utmCampaign: ['utm campaign', 'utm_campaign', 'campaign'],
  utmContent: ['utm content', 'utm_content', 'content'],
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
  
  // DD/MM/YYYY HH:MM:SS format (TMB format)
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

export function autoDetectTmbColumns(headers: string[]): Record<string, string | null> {
  return {
    orderId: findColumn(headers, TMB_COLUMNS.orderId),
    product: findColumn(headers, TMB_COLUMNS.product),
    buyerName: findColumn(headers, TMB_COLUMNS.buyerName),
    buyerEmail: findColumn(headers, TMB_COLUMNS.buyerEmail),
    buyerPhone: findColumn(headers, TMB_COLUMNS.buyerPhone),
    ticketValue: findColumn(headers, TMB_COLUMNS.ticketValue),
    effectiveDate: findColumn(headers, TMB_COLUMNS.effectiveDate),
    utmSource: findColumn(headers, TMB_COLUMNS.utmSource),
    utmMedium: findColumn(headers, TMB_COLUMNS.utmMedium),
    utmCampaign: findColumn(headers, TMB_COLUMNS.utmCampaign),
    utmContent: findColumn(headers, TMB_COLUMNS.utmContent),
  };
}

export function parseTmbData(data: Record<string, unknown>[], headers: string[], customColumnMap?: Record<string, string | null>): TmbParseResult {
  const transactions: TmbTransaction[] = [];
  const errors: TmbParseError[] = [];
  const seenOrderIds = new Set<string>();
  const duplicates: string[] = [];
  
  // Find column mappings - use custom map if provided
  const columnMap = customColumnMap ? {
    orderId: customColumnMap.orderId || null,
    product: customColumnMap.product || null,
    buyerName: customColumnMap.buyerName || null,
    buyerEmail: customColumnMap.buyerEmail || null,
    ticketValue: customColumnMap.ticketValue || null,
    effectiveDate: customColumnMap.effectiveDate || null,
    utmSource: customColumnMap.utmSource || null,
    utmMedium: customColumnMap.utmMedium || null,
    utmCampaign: customColumnMap.utmCampaign || null,
    utmContent: customColumnMap.utmContent || null,
  } : autoDetectTmbColumns(headers);
  
  // Check required columns
  if (!columnMap.orderId) {
    errors.push({
      row: 0,
      type: 'missing_field',
      message: 'Coluna "Pedido" não encontrada',
    });
  }
  
  if (!columnMap.ticketValue) {
    errors.push({
      row: 0,
      type: 'missing_field',
      message: 'Coluna "Ticket (R$)" não encontrada',
    });
  }
  
  data.forEach((row, index) => {
    const rowNum = index + 2; // Account for header row
    
    try {
      const orderId = columnMap.orderId 
        ? String(row[columnMap.orderId] || '').trim()
        : '';
      
      if (!orderId) {
        errors.push({
          row: rowNum,
          type: 'missing_field',
          message: 'ID do pedido não encontrado',
          rawData: row,
        });
        return;
      }
      
      // Check for duplicates
      if (seenOrderIds.has(orderId)) {
        duplicates.push(orderId);
        return;
      }
      seenOrderIds.add(orderId);
      
      const transaction: TmbTransaction = {
        order_id: orderId,
        product: columnMap.product ? String(row[columnMap.product] || '').trim() : '',
        buyer_name: columnMap.buyerName ? String(row[columnMap.buyerName] || '').trim() : '',
        buyer_email: columnMap.buyerEmail ? String(row[columnMap.buyerEmail] || '').trim() : '',
        ticket_value: parseNumber(
          columnMap.ticketValue ? row[columnMap.ticketValue] as string : undefined
        ),
        currency: 'BRL', // TMB is always BRL
        effective_date: parseDate(
          columnMap.effectiveDate ? (row[columnMap.effectiveDate] as string | number | undefined) : undefined
        ),
        utm_source: columnMap.utmSource ? String(row[columnMap.utmSource] || '').trim() : '',
        utm_medium: columnMap.utmMedium ? String(row[columnMap.utmMedium] || '').trim() : '',
        utm_campaign: columnMap.utmCampaign ? String(row[columnMap.utmCampaign] || '').trim() : '',
        utm_content: columnMap.utmContent ? String(row[columnMap.utmContent] || '').trim() : '',
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

export async function parseTmbCSV(file: File): Promise<{ data: Record<string, unknown>[]; headers: string[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ';', // TMB uses semicolon
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

export async function parseTmbFile(file: File): Promise<TmbParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension !== 'csv') {
    throw new Error('TMB suporta apenas arquivos CSV com delimitador ponto-e-vírgula (;)');
  }
  
  const result = await parseTmbCSV(file);
  return parseTmbData(result.data, result.headers);
}
