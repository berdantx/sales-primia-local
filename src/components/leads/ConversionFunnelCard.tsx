import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Target, ShoppingCart, DollarSign, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversionFunnelCardProps {
  totalLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  totalRevenue: number;
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
                  <span className="text-xs sm:text-sm font-medium text-foreground truncate">
                    {stage.label}
                  </span>
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
      </CardContent>
    </Card>
  );
}
