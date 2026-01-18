import { motion } from 'framer-motion';
import { Goal } from '@/hooks/useGoals';
import { calculateGoalProgress, formatCurrency, formatPercent, formatNumber } from '@/lib/calculations/goalCalculations';
import { ColoredKPICard } from './ColoredKPICard';
import { GoalProgressBar } from './GoalProgressBar';
import { ProjectionCards } from './ProjectionCards';
import { Target, TrendingUp, AlertCircle, Flame, Package, Gem } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PlatformBreakdown {
  hotmartBRL: number;
  hotmartPendingBRL?: number; // Valor a receber (recorrências futuras)
  hotmartUSD: number;
  tmbBRL: number;
  eduzzBRL: number;
  usdConvertedBRL: number;
}

interface TransactionCounts {
  hotmart: number;
  tmb: number;
  eduzz: number;
  total: number;
}

interface GoalSummarySectionProps {
  goal: Goal;
  totalSold: number;
  projectionValue?: number;
  platformBreakdown?: PlatformBreakdown;
  salesByDate?: Record<string, Record<string, number>>;
  dollarRate?: number;
  transactionCounts?: TransactionCounts;
}

export function GoalSummarySection({ 
  goal, 
  totalSold, 
  projectionValue, 
  platformBreakdown,
  salesByDate,
  dollarRate,
  transactionCounts,
}: GoalSummarySectionProps) {
  const progress = calculateGoalProgress(goal, totalSold);
  
  const statusText = progress.progressPercent >= 100 
    ? 'Meta atingida!' 
    : progress.isOnTrack 
      ? 'Em progresso' 
      : 'Atenção necessária';

  // Build tooltip content for breakdown
  const buildBreakdownTooltip = (includeProjection = false) => {
    if (!platformBreakdown) return null;
    
    const hasHotmart = platformBreakdown.hotmartBRL > 0 || platformBreakdown.hotmartUSD > 0;
    const hasTmb = platformBreakdown.tmbBRL > 0;
    const hasEduzz = platformBreakdown.eduzzBRL > 0;
    const hasUsdConversion = platformBreakdown.usdConvertedBRL > 0;
    const hasPending = (platformBreakdown.hotmartPendingBRL ?? 0) > 0;
    
    return (
      <div className="space-y-1.5 text-sm min-w-[220px]">
        <p className="font-medium border-b pb-1 mb-2">Composição do Valor</p>
        
        {/* Para o card de Projeção, mostrar separação processado/a receber */}
        {includeProjection && hasHotmart && (
          <>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Hotmart (já processado):</span>
              <span className="font-medium">{formatCurrency(platformBreakdown.hotmartBRL, 'BRL')}</span>
            </div>
            {hasPending && (
              <div className="flex justify-between gap-4 text-amber-500">
                <span>Hotmart (a receber):</span>
                <span className="font-medium">{formatCurrency(platformBreakdown.hotmartPendingBRL!, 'BRL')}</span>
              </div>
            )}
          </>
        )}
        
        {/* Para o card de Faturamento Atual, mostrar apenas o valor processado */}
        {!includeProjection && hasHotmart && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Hotmart (BRL):</span>
            <span className="font-medium">{formatCurrency(platformBreakdown.hotmartBRL, 'BRL')}</span>
          </div>
        )}
        
        {hasTmb && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">TMB:</span>
            <span className="font-medium">{formatCurrency(platformBreakdown.tmbBRL, 'BRL')}</span>
          </div>
        )}
        {hasEduzz && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Eduzz:</span>
            <span className="font-medium">{formatCurrency(platformBreakdown.eduzzBRL, 'BRL')}</span>
          </div>
        )}
        {hasUsdConversion && (
          <>
            <div className="border-t pt-1.5 mt-1.5">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Hotmart (USD):</span>
                <span className="font-medium">{formatCurrency(platformBreakdown.hotmartUSD, 'USD')}</span>
              </div>
              <div className="flex justify-between gap-4 text-xs text-blue-400">
                <span>Convertido ({dollarRate ? `$1 = R$${dollarRate.toFixed(2)}` : 'USD→BRL'}):</span>
                <span>{formatCurrency(platformBreakdown.usdConvertedBRL, 'BRL')}</span>
              </div>
            </div>
          </>
        )}
        
        {/* Explicação de cálculo - apenas para projeção */}
        {includeProjection && (
          <div className="border-t pt-2 mt-2 text-muted-foreground text-xs">
            <p className="font-medium text-foreground">Como é calculado:</p>
            <p>Soma dos valores já processados + parcelas futuras de transações parceladas.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Period Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-2 text-xs sm:text-sm"
      >
        <Badge variant="outline" className="font-normal text-xs">
          Período da Meta Atual
        </Badge>
        <span className="text-muted-foreground">
          {format(parseISO(goal.start_date), "dd/MM/yyyy", { locale: ptBR })} até{' '}
          {format(parseISO(goal.end_date), "dd/MM/yyyy", { locale: ptBR })}
        </span>
        <span className="text-primary font-medium">
          • {progress.daysRemaining} dias restantes
        </span>
      </motion.div>

      {/* 4 Colored KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <ColoredKPICard
          title="Meta de Faturamento"
          value={formatCurrency(goal.target_value, goal.currency)}
          subtitle={goal.name}
          icon={Target}
          variant="blue"
          delay={0}
        />
        <ColoredKPICard
          title="Faturamento Atual"
          value={formatCurrency(progress.totalSold, goal.currency)}
          subtitle={`${formatPercent(progress.progressPercent)} da meta`}
          icon={TrendingUp}
          variant="green"
          delay={1}
          tooltipContent={
            <div className="space-y-2">
              {buildBreakdownTooltip()}
              {transactionCounts && transactionCounts.total > 0 && (
                <div className="border-t pt-2 mt-2">
                  <p className="font-medium text-xs mb-1.5">Transações por Plataforma</p>
                  <div className="flex flex-wrap gap-2">
                    {transactionCounts.hotmart > 0 && (
                      <div className="flex items-center gap-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded px-1.5 py-0.5">
                        <Flame className="h-3 w-3" />
                        <span>{formatNumber(transactionCounts.hotmart)}</span>
                      </div>
                    )}
                    {transactionCounts.tmb > 0 && (
                      <div className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded px-1.5 py-0.5">
                        <Package className="h-3 w-3" />
                        <span>{formatNumber(transactionCounts.tmb)}</span>
                      </div>
                    )}
                    {transactionCounts.eduzz > 0 && (
                      <div className="flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded px-1.5 py-0.5">
                        <Gem className="h-3 w-3" />
                        <span>{formatNumber(transactionCounts.eduzz)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          }
        />
        <ColoredKPICard
          title="Projeção Faturamento"
          value={formatCurrency(projectionValue ?? progress.totalSold, goal.currency)}
          subtitle="Inclui recorrências"
          icon={TrendingUp}
          variant="cyan"
          delay={2}
          tooltipContent={buildBreakdownTooltip(true)}
        />
        <ColoredKPICard
          title="Restante para Meta"
          value={formatCurrency(progress.remaining, goal.currency)}
          subtitle={progress.remaining === 0 ? 'Meta atingida!' : 'Valor a alcançar'}
          icon={AlertCircle}
          variant="red"
          delay={3}
        />
      </div>

      {/* Progress Bar with Sparkline */}
      <GoalProgressBar 
        goal={goal} 
        progress={progress} 
        salesByDate={salesByDate}
        dollarRate={dollarRate}
      />

      {/* Projection Cards */}
      {progress.remaining > 0 && (
        <ProjectionCards progress={progress} currency={goal.currency} />
      )}
    </div>
  );
}
