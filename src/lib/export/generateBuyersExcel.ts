import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface BuyerRow {
  buyer_name: string | null;
  buyer_email: string | null;
  country: string;
  product: string | null;
  value: number;
  currency: string;
  date: string | null;
  platform: string;
}

interface CountrySummary {
  country: string;
  count: number;
  total: number;
}

export function generateBuyersExcel(
  buyers: BuyerRow[],
  countrySummary: CountrySummary[]
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Country Summary
  const summaryData = countrySummary.map((row) => ({
    'País': row.country,
    'Quantidade de Vendas': row.count,
    'Valor Total': row.total,
  }));
  const ws1 = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumo por País');

  // Sheet 2: All Buyers
  const buyersData = buyers.map((row) => ({
    'Nome': row.buyer_name || '-',
    'Email': row.buyer_email || '-',
    'País': row.country,
    'Produto': row.product || '-',
    'Valor': row.value,
    'Moeda': row.currency,
    'Data': row.date ? format(new Date(row.date), 'dd/MM/yyyy') : '-',
    'Plataforma': row.platform,
  }));
  const ws2 = XLSX.utils.json_to_sheet(buyersData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Compradores');

  XLSX.writeFile(wb, `compradores-internacionais-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}
