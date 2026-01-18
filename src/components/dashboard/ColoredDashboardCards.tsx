import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, UserPlus, ShoppingCart, Flame, Package, Gem } from 'lucide-react';
import { ColoredKPICard } from './ColoredKPICard';
import { formatCurrency, formatNumber } from '@/lib/calculations/goalCalculations';

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
}

export function ColoredDashboardCards({
  totalBRL,
  projectedBRL,
  leadCount,
  totalTransactions,
  transactionCounts,
  hasProjection,
  onLeadsClick,
}: ColoredDashboardCardsProps) {
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
  );
}
