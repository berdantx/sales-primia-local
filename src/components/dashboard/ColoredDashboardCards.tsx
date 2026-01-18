import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, UserPlus, ShoppingCart, Flame, Package, Gem } from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ColoredKPICard } from './ColoredKPICard';
import { formatCurrency, formatNumber } from '@/lib/calculations/goalCalculations';
import { Card } from '@/components/ui/card';

interface ProjectionBreakdown {
  hotmartRealBRL: number;
  hotmartPendingBRL: number;
  hotmartUSD: number;
  hotmartUSDConverted: number;
  tmbBRL: number;
  eduzzBRL: number;
}

interface ColoredDashboardCardsProps {
  totalBRL: number;
  projectedBRL: number;
  leadCount: number;
  totalTransactions: number;
  transactionCounts: {
    hotmart: number;
    tmb: number;
    eduzz: number;
  };
  hasProjection: boolean;
  onLeadsClick: () => void;
  salesByDate?: Record<string, Record<string, number>>;
  dollarRate?: number;
  projectionBreakdown?: ProjectionBreakdown;
}

export function ColoredDashboardCards({
  totalBRL,
  projectedBRL,
  leadCount,
  totalTransactions,
  transactionCounts,
  hasProjection,
  onLeadsClick,
  salesByDate,
  dollarRate,
  projectionBreakdown,
}: ColoredDashboardCardsProps) {
  // Process chart data from salesByDate
  const chartData = useMemo(() => {
    if (!salesByDate || Object.keys(salesByDate).length === 0) return [];
    
    const rate = dollarRate || 5.5;
    
    return Object.entries(salesByDate)
      .map(([date, values]) => ({
        date,
        value: (values.BRL || 0) + ((values.USD || 0) * rate),
        formattedDate: format(parseISO(date), 'dd/MM', { locale: ptBR }),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14); // Last 14 days
  }, [salesByDate, dollarRate]);

  // Custom tooltip for sparkline
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = chartData.find(d => d.formattedDate === label);
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs">
          <p className="font-medium">{dataPoint?.formattedDate}</p>
          <p className="text-primary font-bold">
            {formatCurrency(payload[0].value, 'BRL')}
          </p>
        </div>
      );
    }
    return null;
  };

  // Mini badges de transações por plataforma
  const transactionBadges = (
    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/20 flex-wrap">
      {transactionCounts.hotmart > 0 && (
        <div className="flex items-center gap-1 text-xs bg-white/20 rounded px-1.5 py-0.5">
          <Flame className="h-3 w-3" />
          <span>{formatNumber(transactionCounts.hotmart)}</span>
        </div>
      )}
      {transactionCounts.tmb > 0 && (
        <div className="flex items-center gap-1 text-xs bg-white/20 rounded px-1.5 py-0.5">
          <Package className="h-3 w-3" />
          <span>{formatNumber(transactionCounts.tmb)}</span>
        </div>
      )}
      {transactionCounts.eduzz > 0 && (
        <div className="flex items-center gap-1 text-xs bg-white/20 rounded px-1.5 py-0.5">
          <Gem className="h-3 w-3" />
          <span>{formatNumber(transactionCounts.eduzz)}</span>
        </div>
      )}
    </div>
  );

  // Determine grid columns based on what's shown
  const showProjection = hasProjection;
  const cardCount = showProjection ? 4 : 3;

  return (
    <div className="space-y-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`grid grid-cols-2 ${cardCount === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3 sm:gap-4`}
      >
        {/* Faturamento Atual */}
        <ColoredKPICard
          title="Faturamento Atual"
          value={formatCurrency(totalBRL, 'BRL')}
          subtitle="Hotmart + TMB + Eduzz"
          icon={DollarSign}
          variant="green"
          delay={0}
          customContent={transactionBadges}
        />

        {/* Projeção Faturamento - só aparece se houver projeção */}
        {showProjection && (
          <ColoredKPICard
            title="Projeção Faturamento"
            value={formatCurrency(projectedBRL, 'BRL')}
            subtitle="Inclui recorrências"
            icon={TrendingUp}
            variant="cyan"
            delay={1}
            tooltipContent={
              projectionBreakdown ? (
                <div className="space-y-2 text-sm min-w-[220px]">
                  <p className="font-medium border-b pb-1 mb-2">Composição do Valor</p>
                  
                  {/* Hotmart já processado */}
                  {projectionBreakdown.hotmartRealBRL > 0 && (
                    <div className="flex justify-between gap-4">
                      <span>Hotmart (já processado):</span>
                      <span className="font-medium">{formatCurrency(projectionBreakdown.hotmartRealBRL, 'BRL')}</span>
                    </div>
                  )}
                  
                  {/* Hotmart a receber - destaque em amber */}
                  {projectionBreakdown.hotmartPendingBRL > 0 && (
                    <div className="flex justify-between gap-4 text-amber-500">
                      <span>Hotmart (a receber):</span>
                      <span className="font-medium">{formatCurrency(projectionBreakdown.hotmartPendingBRL, 'BRL')}</span>
                    </div>
                  )}
                  
                  {/* TMB */}
                  {projectionBreakdown.tmbBRL > 0 && (
                    <div className="flex justify-between gap-4">
                      <span>TMB:</span>
                      <span className="font-medium">{formatCurrency(projectionBreakdown.tmbBRL, 'BRL')}</span>
                    </div>
                  )}
                  
                  {/* Eduzz */}
                  {projectionBreakdown.eduzzBRL > 0 && (
                    <div className="flex justify-between gap-4">
                      <span>Eduzz:</span>
                      <span className="font-medium">{formatCurrency(projectionBreakdown.eduzzBRL, 'BRL')}</span>
                    </div>
                  )}
                  
                  {/* Hotmart USD convertido - destaque em azul */}
                  {projectionBreakdown.hotmartUSD > 0 && (
                    <div className="flex justify-between gap-4 text-blue-400">
                      <span>Hotmart (USD convertido):</span>
                      <span className="font-medium">{formatCurrency(projectionBreakdown.hotmartUSDConverted, 'BRL')}</span>
                    </div>
                  )}
                  
                  {/* Explicação de cálculo */}
                  <div className="border-t pt-2 mt-2 text-muted-foreground text-xs">
                    <p className="font-medium text-foreground">Como é calculado:</p>
                    <p>Soma dos valores já processados + parcelas futuras de transações parceladas.</p>
                  </div>
                </div>
              ) : undefined
            }
          />
        )}

        {/* Total de Leads */}
        <ColoredKPICard
          title="Total de Leads"
          value={formatNumber(leadCount)}
          subtitle="no período"
          icon={UserPlus}
          variant="purple"
          delay={showProjection ? 2 : 1}
          onClick={onLeadsClick}
          className="cursor-pointer"
        />

        {/* Transações */}
        <ColoredKPICard
          title="Transações"
          value={formatNumber(totalTransactions)}
          subtitle="no período"
          icon={ShoppingCart}
          variant="blue"
          delay={showProjection ? 3 : 2}
        />
      </motion.div>

      {/* Sparkline de Evolução Diária */}
      {chartData.length > 2 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Evolução Diária (últimos {chartData.length} dias)
            </p>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <XAxis 
                    dataKey="formattedDate" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    interval="preserveStartEnd"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
