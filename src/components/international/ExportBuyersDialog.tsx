import { FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Download } from 'lucide-react';
import { generateBuyersPdf } from '@/lib/export/generateBuyersPdf';
import { generateBuyersExcel } from '@/lib/export/generateBuyersExcel';
import { toast } from 'sonner';

interface BuyerExport {
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

interface Props {
  buyers: BuyerExport[];
  countrySummary: CountrySummary[];
  periodLabel: string;
}

export function ExportBuyersDialog({ buyers, countrySummary, periodLabel }: Props) {
  const handlePdf = () => {
    try {
      generateBuyersPdf(buyers, countrySummary, periodLabel);
      toast.success('PDF gerado com sucesso!');
    } catch {
      toast.error('Erro ao gerar PDF');
    }
  };

  const handleExcel = () => {
    try {
      generateBuyersExcel(buyers, countrySummary);
      toast.success('Planilha gerada com sucesso!');
    } catch {
      toast.error('Erro ao gerar planilha');
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Compradores Internacionais</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {buyers.length} compradores • {countrySummary.length} países
        </p>
        <div className="flex flex-col gap-3 mt-2">
          <Button variant="outline" className="justify-start gap-3 h-12" onClick={handlePdf}>
            <FileText className="h-5 w-5 text-red-500" />
            <div className="text-left">
              <div className="font-medium">Relatório PDF</div>
              <div className="text-xs text-muted-foreground">Resumo por país + tabela de compradores</div>
            </div>
          </Button>
          <Button variant="outline" className="justify-start gap-3 h-12" onClick={handleExcel}>
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            <div className="text-left">
              <div className="font-medium">Planilha Excel</div>
              <div className="text-xs text-muted-foreground">2 abas: resumo por país + compradores</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
