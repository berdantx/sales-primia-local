import jsPDF from 'jspdf';
import { LandingPageConversion } from '@/hooks/useLandingPageConversion';

interface FunnelPdfData {
  totalLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  totalRevenue: number;
  averageTicket: number;
  conversionRate: number;
  qualificationRate: number;
  topPages: LandingPageConversion[];
  clientName?: string;
  dateRange?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function generateFunnelPdf(data: FunnelPdfData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Header
  doc.setFillColor(59, 130, 246); // primary blue
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório do Funil de Conversão', margin, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Gerado em ${dateStr}`, margin, 35);
  
  if (data.clientName) {
    doc.text(`Cliente: ${data.clientName}`, pageWidth - margin - 60, 35);
  }
  
  yPos = 55;
  doc.setTextColor(0, 0, 0);

  // Period info
  if (data.dateRange) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Período: ${data.dateRange}`, margin, yPos);
    yPos += 10;
  }

  // === Funnel Visualization ===
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Funil de Conversão', margin, yPos);
  yPos += 15;

  // Define funnel stages
  const funnelStages = [
    { label: 'Total de Leads', value: data.totalLeads, color: [59, 130, 246], width: 100 },
    { label: 'Qualificados (UTMs)', value: data.qualifiedLeads, color: [147, 51, 234], width: 75 },
    { label: 'Convertidos', value: data.convertedLeads, color: [34, 197, 94], width: 50 },
  ];

  const funnelWidth = pageWidth - margin * 2;
  const stageHeight = 18;
  const stageGap = 8;

  funnelStages.forEach((stage, index) => {
    const stageWidth = (funnelWidth * stage.width) / 100;
    const xOffset = (funnelWidth - stageWidth) / 2 + margin;
    
    // Draw stage bar
    doc.setFillColor(stage.color[0], stage.color[1], stage.color[2]);
    doc.roundedRect(xOffset, yPos, stageWidth, stageHeight, 3, 3, 'F');
    
    // Stage text
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(stage.label, xOffset + 8, yPos + 11);
    
    // Value on the right
    doc.text(formatNumber(stage.value), xOffset + stageWidth - 8, yPos + 11, { align: 'right' });
    
    // Percentage (except first)
    if (index > 0) {
      const percentage = data.totalLeads > 0 ? (stage.value / data.totalLeads) * 100 : 0;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`(${formatPercent(percentage)} do total)`, pageWidth / 2, yPos + stageHeight + 4, { align: 'center' });
    }
    
    yPos += stageHeight + stageGap + (index > 0 ? 4 : 0);
  });

  yPos += 10;

  // === KPI Summary ===
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, yPos, funnelWidth, 45, 3, 3, 'F');
  
  const kpiWidth = funnelWidth / 4;
  const kpis = [
    { label: 'Receita Total', value: formatCurrency(data.totalRevenue), color: [245, 158, 11] },
    { label: 'Ticket Médio', value: formatCurrency(data.averageTicket), color: [59, 130, 246] },
    { label: 'Taxa Qualificação', value: formatPercent(data.qualificationRate), color: [147, 51, 234] },
    { label: 'Taxa Conversão', value: formatPercent(data.conversionRate), color: [34, 197, 94] },
  ];
  
  kpis.forEach((kpi, i) => {
    const kpiX = margin + kpiWidth * i + kpiWidth / 2;
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(kpi.label, kpiX, yPos + 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, kpiX, yPos + 30, { align: 'center' });
  });
  
  yPos += 60;

  // === Top Pages by Revenue ===
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Top Páginas por Receita', margin, yPos);
  yPos += 10;

  if (data.topPages.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Nenhuma página com conversões registradas.', margin, yPos);
    yPos += 15;
  } else {
    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, funnelWidth, 10, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    
    const col1 = margin + 5;
    const col2 = margin + 90;
    const col3 = margin + 120;
    const col4 = margin + 150;
    
    doc.text('Página', col1, yPos + 7);
    doc.text('Leads', col2, yPos + 7);
    doc.text('Conv.', col3, yPos + 7);
    doc.text('Receita', col4, yPos + 7);
    
    yPos += 12;

    // Table rows
    const sortedPages = [...data.topPages]
      .filter(p => p.convertedLeads > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    sortedPages.forEach((page, index) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = margin;
      }
      
      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPos - 2, funnelWidth, 10, 'F');
      }
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      
      // Truncate long URLs
      const displayUrl = page.displayName.length > 40 
        ? page.displayName.substring(0, 37) + '...' 
        : page.displayName;
      
      doc.text(displayUrl, col1, yPos + 5);
      doc.text(formatNumber(page.totalLeads), col2, yPos + 5);
      doc.text(`${page.convertedLeads} (${formatPercent(page.conversionRate)})`, col3, yPos + 5);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(245, 158, 11);
      doc.text(formatCurrency(page.totalRevenue), col4, yPos + 5);
      
      yPos += 10;
    });
  }

  // Footer
  yPos = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Relatório gerado automaticamente pelo sistema de análise de leads', pageWidth / 2, yPos, { align: 'center' });

  // Save the PDF
  const fileName = `funil-conversao-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
