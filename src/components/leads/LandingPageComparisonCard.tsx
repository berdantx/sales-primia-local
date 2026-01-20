import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Sparkles, 
  Calendar,
  BarChart3,
  Info,
  Target
} from 'lucide-react';
import { LandingPageStats } from '@/hooks/useLandingPageStats';
import { LandingPageConversion } from '@/hooks/useLandingPageConversion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface LandingPageComparisonCardProps {
  stats: LandingPageStats[];
  conversionStats?: LandingPageConversion[];
  isLoading?: boolean;
  selectedPage?: string | null;
  onPageClick?: (page: string | null) => void;
  showAllPages?: boolean;
  hiddenPagesCount?: number;
  onToggleShowAll?: () => void;
}

const getTrendIcon = (trend: LandingPageStats['trend']) => {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'down':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    case 'new':
      return <Sparkles className="h-4 w-4 text-blue-500" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
};

const getTrendLabel = (trend: LandingPageStats['trend'], percentage: number) => {
  switch (trend) {
    case 'up':
      return `+${percentage.toFixed(0)}%`;
    case 'down':
      return `${percentage.toFixed(0)}%`;
    case 'new':
      return '🆕 Novo';
    default:
      return 'Estável';
  }
};

const getTrendColor = (trend: LandingPageStats['trend']) => {
  switch (trend) {
    case 'up':
      return 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400';
    case 'down':
      return 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400';
    case 'new':
      return 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400';
    default:
      return 'text-muted-foreground bg-muted';
  }
};

export function LandingPageComparisonCard({
  stats,
  conversionStats = [],
  isLoading,
  selectedPage,
  onPageClick,
  showAllPages,
  hiddenPagesCount = 0,
  onToggleShowAll,
}: LandingPageComparisonCardProps) {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const isPageInactive = (page: LandingPageStats) => {
    return page.lastLeadDate && page.lastLeadDate < sevenDaysAgo;
  };

  // Create a map for quick conversion lookup
  const conversionMap = new Map(
    conversionStats.map(c => [c.normalizedUrl, c])
  );
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Comparativo de Landing Pages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Comparativo de Landing Pages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground py-8 text-center">
            Nenhuma landing page encontrada no período selecionado.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Comparativo de Landing Pages
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                  <Info className="h-3 w-3" />
                  <span>Tendência vs 7 dias anteriores</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>A tendência compara os últimos 7 dias com os 7 dias anteriores</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Página</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>1º Lead</span>
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <BarChart3 className="h-3 w-3" />
                    <span>Média/Dia</span>
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Target className="h-3 w-3" />
                    <span>Conversão</span>
                  </div>
                </TableHead>
                <TableHead className="text-center">Tendência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((page, index) => {
                const isSelected = selectedPage === page.normalizedUrl;
                const inactive = isPageInactive(page);
                const conversion = conversionMap.get(page.normalizedUrl);
                const hasConversions = conversion && conversion.convertedLeads > 0;
                return (
                  <motion.tr
                    key={page.normalizedUrl}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onPageClick?.(isSelected ? null : page.normalizedUrl)}
                    className={`cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-primary/10 hover:bg-primary/15' 
                        : inactive
                          ? 'opacity-60 hover:bg-muted/30'
                          : 'hover:bg-muted/50'
                    }`}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate max-w-[160px] block">
                                {page.displayName}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <div className="space-y-1">
                                <p className="font-medium">{page.displayName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {page.percentage.toFixed(1)}% do total
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Clique para {isSelected ? 'remover' : 'filtrar'}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {inactive && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 text-muted-foreground">
                            Inativa
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="font-mono">
                        {page.leadCount.toLocaleString('pt-BR')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {page.firstLeadDate 
                        ? format(page.firstLeadDate, 'dd/MM', { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {page.dailyAverage.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-center">
                      {hasConversions ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="default" className="font-mono bg-green-600 hover:bg-green-700">
                                {conversion.conversionRate.toFixed(1)}%
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-1">
                                <p>{conversion.convertedLeads} conversões</p>
                                <p>R$ {conversion.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getTrendColor(page.trend)}`}>
                          {getTrendIcon(page.trend)}
                          <span>{getTrendLabel(page.trend, page.trendPercentage)}</span>
                        </span>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
              {!showAllPages && hiddenPagesCount > 0 && onToggleShowAll && (
                <TableRow 
                  onClick={onToggleShowAll}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground italic py-3">
                    Mostrar {hiddenPagesCount} página(s) inativa(s)
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
