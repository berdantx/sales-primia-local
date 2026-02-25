import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BuyerRow {
  buyer_name: string | null;
  buyer_email: string | null;
  country: string;
  product: string | null;
  value: number;
  currency: string;
  date: string | null;
}

interface CountrySummary {
  country: string;
  count: number;
  total: number;
}

export function generateBuyersPdf(
  buyers: BuyerRow[],
  countrySummary: CountrySummary[],
  periodLabel: string
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.text('Relatório de Compradores Internacionais', 14, 20);
  doc.setFontSize(10);
  doc.text(`Período: ${periodLabel}`, 14, 28);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 34);
  doc.text(`Total de compradores: ${buyers.length}`, 14, 40);

  // Country summary table
  doc.setFontSize(12);
  doc.text('Resumo por País', 14, 52);

  const summaryHeaders = ['País', 'Vendas', 'Valor Total (USD)'];
  const summaryColWidths = [80, 40, 60];
  let y = 58;

  doc.setFontSize(9);
  doc.setFont(undefined!, 'bold');
  let x = 14;
  summaryHeaders.forEach((h, i) => {
    doc.text(h, x, y);
    x += summaryColWidths[i];
  });
  doc.setFont(undefined!, 'normal');
  y += 6;

  countrySummary.slice(0, 15).forEach((row) => {
    x = 14;
    doc.text(row.country, x, y);
    x += summaryColWidths[0];
    doc.text(String(row.count), x, y);
    x += summaryColWidths[1];
    doc.text(row.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), x, y);
    y += 5;
    if (y > 190) {
      doc.addPage();
      y = 20;
    }
  });

  // Buyers table
  doc.addPage();
  doc.setFontSize(12);
  doc.text('Compradores Internacionais', 14, 20);
  y = 28;

  const headers = ['Nome', 'Email', 'País', 'Produto', 'Valor', 'Data'];
  const colWidths = [45, 55, 35, 50, 30, 30];

  doc.setFontSize(8);
  doc.setFont(undefined!, 'bold');
  x = 14;
  headers.forEach((h, i) => {
    doc.text(h, x, y);
    x += colWidths[i];
  });
  doc.setFont(undefined!, 'normal');
  y += 5;

  buyers.forEach((row) => {
    if (y > 190) {
      doc.addPage();
      y = 20;
    }
    x = 14;
    doc.text((row.buyer_name || '-').substring(0, 22), x, y);
    x += colWidths[0];
    doc.text((row.buyer_email || '-').substring(0, 28), x, y);
    x += colWidths[1];
    doc.text(row.country.substring(0, 16), x, y);
    x += colWidths[2];
    doc.text((row.product || '-').substring(0, 24), x, y);
    x += colWidths[3];
    doc.text(`${row.currency} ${row.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, x, y);
    x += colWidths[4];
    doc.text(row.date ? format(new Date(row.date), 'dd/MM/yyyy') : '-', x, y);
    y += 4.5;
  });

  doc.save(`compradores-internacionais-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
