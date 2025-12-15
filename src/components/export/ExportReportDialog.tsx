import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { generateExcelReport } from '@/lib/export/generateExcelReport';
import { useTransactions } from '@/hooks/useTransactions';
import { useTmbTransactions } from '@/hooks/useTmbTransactions';
import { 
  useTransactionStatsOptimized 
} from '@/hooks/useTransactionStatsOptimized';
import { useTmbTransactionStatsOptimized } from '@/hooks/useTmbTransactionStatsOptimized';
import { toast } from 'sonner';

interface ExportReportDialogProps {
  trigger?: React.ReactNode;
}

export function ExportReportDialog({ trigger }: ExportReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState({
    includeHotmart: true,
    includeTmb: true,
    includeSummary: true,
    includeCombined: true,
  });

  // Fetch all data
  const { data: hotmartTransactions, isLoading: loadingHotmart } = useTransactions({});
  const { data: tmbTransactions, isLoading: loadingTmb } = useTmbTransactions({});
  const { data: hotmartStats, isLoading: loadingHotmartStats } = useTransactionStatsOptimized({});
  const { data: tmbStats, isLoading: loadingTmbStats } = useTmbTransactionStatsOptimized({});

  const isLoading = loadingHotmart || loadingTmb || loadingHotmartStats || loadingTmbStats;

  const handleExport = async () => {
    try {
      setIsExporting(true);

      generateExcelReport(
        {
          hotmartTransactions: hotmartTransactions || [],
          tmbTransactions: tmbTransactions || [],
          hotmartStats: {
            totalBRL: hotmartStats?.totalByCurrency?.BRL || 0,
            totalUSD: hotmartStats?.totalByCurrency?.USD || 0,
            totalTransactions: hotmartStats?.totalTransactions || 0,
          },
          tmbStats: {
            totalBRL: tmbStats?.totalBRL || 0,
            totalTransactions: tmbStats?.totalTransactions || 0,
          },
        },
        {
          ...options,
          dateRange: null,
        }
      );

      toast.success('Relatório exportado com sucesso!');
      setOpen(false);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Erro ao exportar relatório');
    } finally {
      setIsExporting(false);
    }
  };

  const toggleOption = (key: keyof typeof options) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasAnySelected = Object.values(options).some(Boolean);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Exportar Relatório Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione as seções que deseja incluir no relatório:
            </p>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="summary"
                  checked={options.includeSummary}
                  onCheckedChange={() => toggleOption('includeSummary')}
                />
                <Label htmlFor="summary" className="cursor-pointer">
                  Resumo de KPIs
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="hotmart"
                  checked={options.includeHotmart}
                  onCheckedChange={() => toggleOption('includeHotmart')}
                />
                <Label htmlFor="hotmart" className="cursor-pointer">
                  Transações Hotmart
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="tmb"
                  checked={options.includeTmb}
                  onCheckedChange={() => toggleOption('includeTmb')}
                />
                <Label htmlFor="tmb" className="cursor-pointer">
                  Transações TMB
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="combined"
                  checked={options.includeCombined}
                  onCheckedChange={() => toggleOption('includeCombined')}
                />
                <Label htmlFor="combined" className="cursor-pointer">
                  Transações Consolidadas
                </Label>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="font-medium mb-1">O arquivo Excel incluirá:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {options.includeSummary && <li>Aba "Resumo" com KPIs consolidados</li>}
              {options.includeHotmart && <li>Aba "Hotmart" com transações detalhadas</li>}
              {options.includeTmb && <li>Aba "TMB" com transações detalhadas</li>}
              {options.includeCombined && <li>Aba "Consolidado" com todas as transações</li>}
            </ul>
          </div>

          <Button
            onClick={handleExport}
            disabled={isLoading || isExporting || !hasAnySelected}
            className="w-full"
          >
            {isExporting || isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isLoading ? 'Carregando dados...' : 'Exportando...'}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Baixar Relatório Excel
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
