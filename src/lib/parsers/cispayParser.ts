import * as XLSX from 'xlsx';

export interface CispayTransaction {
  sale_id: string;
  product: string;
  product_code: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  sale_value: number;
  currency: string;
  sale_date: Date | null;
  turma: string;
  promotion: string;
  unit: string;
  enrollment_type: string;
}

export interface CispayParseResult {
  transactions: CispayTransaction[];
  errors: CispayParseError[];
  totalRows: number;
  duplicates: string[];
}

export interface CispayParseError {
  row: number;
  type: 'missing_field' | 'invalid_value' | 'parse_error';
  message: string;
  rawData?: Record<string, unknown>;
}

const CISPAY_COLUMNS = {
  saleId: ['id da venda', 'id venda', 'sale_id', 'id'],
  buyerName: ['nome do cliente', 'nome cliente', 'buyer_name', 'cliente'],
  buyerEmail: ['cliente pessoal: email', 'email', 'e-mail', 'buyer_email'],
  buyerPhone: ['cliente pessoal: celular', 'celular', 'telefone', 'phone', 'buyer_phone'],
  saleValue: ['valor', 'value', 'sale_value', 'total'],
  saleDate: ['data de aprovação', 'data aprovação', 'data de aprovacao', 'data', 'sale_date'],
  productCode: ['código do curso', 'codigo do curso', 'product_code', 'codigo curso'],
  product: ['nome da venda', 'nome venda', 'produto', 'product'],
  turma: ['turma', 'class', 'turma/classe'],
  promotion: ['promoção', 'promocao', 'promotion'],
  unit: ['unidade realizadora do curso', 'unidade', 'unit'],
  enrollmentType: ['tipo de matrícula', 'tipo de matricula', 'tipo matricula', 'enrollment_type'],
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function findColumn(headers: string[], possibleNames: string[]): string | null {
  const normalizedHeaders = headers.map(normalizeHeader);
  
  for (const name of possibleNames) {
    const normalizedName = normalizeHeader(name);
    const exactIndex = normalizedHeaders.findIndex(h => h === normalizedName);
    if (exactIndex !== -1) return headers[exactIndex];
  }
  
  for (const name of possibleNames) {
    const normalizedName = normalizeHeader(name);
    const index = normalizedHeaders.findIndex(h => 
      h.includes(normalizedName) || normalizedName.includes(h)
    );
    if (index !== -1) return headers[index];
  }
  return null;
}

/**
 * Parse CIS PAY value format: "BRL 35,000.00" or "BRL 1,780.00"
 */
function parseCispayValue(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 0;
  
  const strValue = String(value).trim();
  
  // Remove currency prefix (BRL, USD, etc.)
  const cleaned = strValue.replace(/^[A-Z]{3}\s*/i, '').trim();
  
  // Format "35,000.00" - US number format with comma as thousands separator
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    if (lastDot > lastComma) {
      // US format: 35,000.00
      return parseFloat(cleaned.replace(/,/g, '')) || 0;
    } else {
      // BR format: 35.000,00
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
    }
  }
  
  // Only comma: could be BR decimal
  if (cleaned.includes(',')) {
    return parseFloat(cleaned.replace(',', '.')) || 0;
  }
  
  return parseFloat(cleaned) || 0;
}

function parseDate(value: string | number | undefined): Date | null {
  if (value === undefined || value === null || value === '') return null;
  
  const strValue = String(value).trim();
  if (!strValue) return null;
  
  // DD/MM/YYYY HH:MM:SS
  const brDateTimeMatch = strValue.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})[\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  if (brDateTimeMatch) {
    const [, d, m, y, h, min, sec = '0'] = brDateTimeMatch;
    let day = parseInt(d), month = parseInt(m);
    if (day > 12) { /* day is day */ } 
    else if (month > 12) { [day, month] = [month, day]; }
    // else assume DD/MM
    const date = new Date(parseInt(y), month - 1, day, parseInt(h), parseInt(min), parseInt(sec));
    if (!isNaN(date.getTime())) return date;
  }
  
  // DD/MM/YYYY
  const brDateMatch = strValue.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brDateMatch) {
    const [, d, m, y] = brDateMatch;
    let day = parseInt(d), month = parseInt(m);
    if (day > 12) { /* ok */ }
    else if (month > 12) { [day, month] = [month, day]; }
    const date = new Date(parseInt(y), month - 1, day);
    if (!isNaN(date.getTime())) return date;
  }
  
  // YYYY-MM-DD
  const isoMatch = strValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
}

export function autoDetectCispayColumns(headers: string[]): Record<string, string | null> {
  return {
    saleId: findColumn(headers, CISPAY_COLUMNS.saleId),
    buyerName: findColumn(headers, CISPAY_COLUMNS.buyerName),
    buyerEmail: findColumn(headers, CISPAY_COLUMNS.buyerEmail),
    buyerPhone: findColumn(headers, CISPAY_COLUMNS.buyerPhone),
    saleValue: findColumn(headers, CISPAY_COLUMNS.saleValue),
    saleDate: findColumn(headers, CISPAY_COLUMNS.saleDate),
    productCode: findColumn(headers, CISPAY_COLUMNS.productCode),
    product: findColumn(headers, CISPAY_COLUMNS.product),
    turma: findColumn(headers, CISPAY_COLUMNS.turma),
    promotion: findColumn(headers, CISPAY_COLUMNS.promotion),
    unit: findColumn(headers, CISPAY_COLUMNS.unit),
    enrollmentType: findColumn(headers, CISPAY_COLUMNS.enrollmentType),
  };
}

export function parseCispayData(
  data: Record<string, unknown>[],
  headers: string[],
  customColumnMap?: Record<string, string | null>
): CispayParseResult {
  const transactions: CispayTransaction[] = [];
  const errors: CispayParseError[] = [];
  const duplicates: string[] = [];
  
  const columnMap = customColumnMap
    ? {
        saleId: customColumnMap.saleId || null,
        buyerName: customColumnMap.buyerName || null,
        buyerEmail: customColumnMap.buyerEmail || null,
        buyerPhone: customColumnMap.buyerPhone || null,
        saleValue: customColumnMap.saleValue || null,
        saleDate: customColumnMap.saleDate || null,
        productCode: customColumnMap.productCode || null,
        product: customColumnMap.product || null,
        turma: customColumnMap.turma || null,
        promotion: customColumnMap.promotion || null,
        unit: customColumnMap.unit || null,
        enrollmentType: customColumnMap.enrollmentType || null,
      }
    : autoDetectCispayColumns(headers);
  
  if (!columnMap.saleId) {
    errors.push({ row: 0, type: 'missing_field', message: 'Coluna "ID da venda" não encontrada' });
  }
  
  const groupedBySaleId = new Map<string, { transaction: CispayTransaction; rowNum: number }>();
  
  data.forEach((row, index) => {
    const rowNum = index + 2;
    
    try {
      const saleId = columnMap.saleId ? String(row[columnMap.saleId] || '').trim() : '';
      
      if (!saleId) {
        errors.push({ row: rowNum, type: 'missing_field', message: 'ID da venda não encontrado', rawData: row });
        return;
      }
      
      const transaction: CispayTransaction = {
        sale_id: saleId,
        product: columnMap.product ? String(row[columnMap.product] || '').trim() : '',
        product_code: columnMap.productCode ? String(row[columnMap.productCode] || '').trim() : '',
        buyer_name: columnMap.buyerName ? String(row[columnMap.buyerName] || '').trim() : '',
        buyer_email: columnMap.buyerEmail ? String(row[columnMap.buyerEmail] || '').trim() : '',
        buyer_phone: columnMap.buyerPhone ? String(row[columnMap.buyerPhone] || '').trim() : '',
        sale_value: parseCispayValue(columnMap.saleValue ? row[columnMap.saleValue] as string : undefined),
        currency: 'BRL',
        sale_date: parseDate(columnMap.saleDate ? (row[columnMap.saleDate] as string | number | undefined) : undefined),
        turma: columnMap.turma ? String(row[columnMap.turma] || '').trim() : '',
        promotion: columnMap.promotion ? String(row[columnMap.promotion] || '').trim() : '',
        unit: columnMap.unit ? String(row[columnMap.unit] || '').trim() : '',
        enrollment_type: columnMap.enrollmentType ? String(row[columnMap.enrollmentType] || '').trim() : '',
      };
      
      const existing = groupedBySaleId.get(saleId);
      if (existing) {
        duplicates.push(saleId);
        if (transaction.sale_value > existing.transaction.sale_value) {
          groupedBySaleId.set(saleId, { transaction, rowNum });
        }
      } else {
        groupedBySaleId.set(saleId, { transaction, rowNum });
      }
    } catch (error) {
      errors.push({ row: rowNum, type: 'parse_error', message: `Erro ao processar linha: ${error}`, rawData: row });
    }
  });
  
  for (const { transaction } of groupedBySaleId.values()) {
    transactions.push(transaction);
  }
  
  return { transactions, errors, totalRows: data.length, duplicates };
}

export async function parseCispayXLSX(file: File): Promise<{ data: Record<string, unknown>[]; headers: string[] }> {
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

export async function parseCispayFile(file: File): Promise<CispayParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'xlsx' || extension === 'xls') {
    const result = await parseCispayXLSX(file);
    return parseCispayData(result.data, result.headers);
  }
  
  throw new Error('CIS PAY suporta apenas arquivos XLSX');
}
