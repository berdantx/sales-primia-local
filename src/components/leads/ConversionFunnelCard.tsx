import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Target, ShoppingCart, DollarSign, ArrowDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LandingPageConversion } from '@/hooks/useLandingPageConversion';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConversionFunnelCardProps {
  totalLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  totalRevenue: number;
  topConvertingPages?: LandingPageConversion[];
  isLoading?: boolean;
}

interface FunnelStage {
  label: string;
  value: number;
  formattedValue: string;
  percentage: number;
  dropRate?: number;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  widthPercent: number;
  hasTooltip?: boolean;
  tooltipContent?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function ConversionFunnelCard({
  totalLeads,
  qualifiedLeads,
  convertedLeads,
  totalRevenue,
  topConvertingPages = [],
  isLoading = false,
}: ConversionFunnelCardProps) {
  const averageTicket = convertedLeads > 0 ? totalRevenue / convertedLeads : 0;

  const stages: FunnelStage[] = [
    {
      label: 'Total de Leads',
      value: totalLeads,
      formattedValue: formatNumber(totalLeads),
      percentage: 100,
      icon: Users,
      colorClass: 'text-primary',
      bgClass: 'bg-primary/20',
      widthPercent: 100,
    },
    {
      label: 'Qualificados (UTMs)',
      value: qualifiedLeads,
      formattedValue: formatNumber(qualifiedLeads),
      percentage: totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0,
      dropRate: totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0,
      icon: Target,
      colorClass: 'text-purple-600 dark:text-purple-400',
      bgClass: 'bg-purple-500/20',
      widthPercent: 75,
      hasTooltip: true,
      tooltipContent: 'Leads com UTM source, medium e campaign preenchidos',
    },
    {
      label: 'Convertidos',
      value: convertedLeads,
      formattedValue: formatNumber(convertedLeads),
      percentage: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
      dropRate: qualifiedLeads > 0 ? (convertedLeads / qualifiedLeads) * 100 : 0,
      icon: ShoppingCart,
      colorClass: 'text-success',
      bgClass: 'bg-success/20',
      widthPercent: 50,
    },
    {
      label: 'Receita Total',
      value: totalRevenue,
      formattedValue: formatCurrency(totalRevenue),
      percentage: 100,
      icon: DollarSign,
      colorClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-500/20',
      widthPercent: 35,
    },
  ];

  // Get top 5 converting pages
  const top5Pages = topConvertingPages
    .filter(p => p.convertedLeads > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[100, 75, 50, 35].map((width, i) => (
            <div key={i} className="flex flex-col items-center">
              <Skeleton className="h-14 rounded-lg" style={{ width: `${width}%` }} />
              {i < 3 && <Skeleton className="h-6 w-6 mt-2 rounded-full" />}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Funil de Conversão
          {averageTicket > 0 && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              Ticket Médio: {formatCurrency(averageTicket)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funnel visualization */}
          <div className="flex flex-col items-center space-y-1">
            {stages.map((stage, index) => (
              <motion.div
                key={stage.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="w-full flex flex-col items-center"
              >
                {/* Stage bar */}
                <div
                  className={cn(
                    'relative flex items-center justify-between px-4 py-3 rounded-lg transition-all',
                    stage.bgClass
                  )}
                  style={{ width: `${stage.widthPercent}%` }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn('p-1.5 rounded-full bg-white/50 dark:bg-black/20', stage.colorClass)}>
                      <stage.icon className="h-4 w-4" />
                    </div>
                    {stage.hasTooltip ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs sm:text-sm font-medium text-foreground truncate cursor-help underline decoration-dotted underline-offset-2">
                            {stage.label}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">{stage.tooltipContent}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-xs sm:text-sm font-medium text-foreground truncate">
                        {stage.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('text-sm sm:text-base font-bold', stage.colorClass)}>
                      {stage.formattedValue}
                    </span>
                    {index > 0 && index < 3 && (
                      <span className="text-xs text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded">
                        {stage.percentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Drop indicator arrow */}
                {index < stages.length - 1 && (
                  <div className="flex items-center gap-1 py-1 text-muted-foreground">
                    <ArrowDown className="h-4 w-4" />
                    {stages[index + 1].dropRate !== undefined && index < 2 && (
                      <span className="text-xs font-medium">
                        {stages[index + 1].dropRate?.toFixed(1)}%
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Top converting pages breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-primary" />
              Top Páginas por Receita
            </h4>
            
            {top5Pages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma página com conversões ainda
              </p>
            ) : (
              <div className="space-y-2">
                {top5Pages.map((page, index) => {
                  const revenueShare = totalRevenue > 0 ? (page.totalRevenue / totalRevenue) * 100 : 0;
                  
                  return (
                    <motion.div
                      key={page.normalizedUrl}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group"
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-help">
                            <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">
                              #{index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate text-foreground">
                                {page.displayName}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-success font-medium">
                                  {page.convertedLeads} conv.
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  ({page.conversionRate.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                {formatCurrency(page.totalRevenue)}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {revenueShare.toFixed(1)}% do total
                              </p>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="text-xs space-y-1">
                            <p><strong>Página:</strong> {page.normalizedUrl}</p>
                            <p><strong>Total Leads:</strong> {page.totalLeads}</p>
                            <p><strong>Convertidos:</strong> {page.convertedLeads}</p>
                            <p><strong>Ticket Médio:</strong> {formatCurrency(page.averageTicket)}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
