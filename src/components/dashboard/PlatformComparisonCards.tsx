import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatNumber } from '@/lib/calculations/goalCalculations';
import { TrendingUp, TrendingDown, Minus, DollarSign, ShoppingCart, Receipt } from 'lucide-react';

interface PlatformStats {
  totalBRL: number;
  totalUSD?: number;
  totalTransactions: number;
}

interface PlatformComparisonCardsProps {
  hotmartStats: PlatformStats | null;
  tmbStats: PlatformStats | null;
  eduzzStats: PlatformStats | null;
}

export function PlatformComparisonCards({ hotmartStats, tmbStats, eduzzStats }: PlatformComparisonCardsProps) {
  const hotmartBRL = hotmartStats?.totalBRL || 0;
  const tmbBRL = tmbStats?.totalBRL || 0;
  const eduzzBRL = eduzzStats?.totalBRL || 0;
  const totalBRL = hotmartBRL + tmbBRL + eduzzBRL;
  
  const hotmartTransactions = hotmartStats?.totalTransactions || 0;
  const tmbTransactions = tmbStats?.totalTransactions || 0;
  const eduzzTransactions = eduzzStats?.totalTransactions || 0;
  const totalTransactions = hotmartTransactions + tmbTransactions + eduzzTransactions;
  
  const hotmartTicket = hotmartTransactions > 0 ? hotmartBRL / hotmartTransactions : 0;
  const tmbTicket = tmbTransactions > 0 ? tmbBRL / tmbTransactions : 0;
  const eduzzTicket = eduzzTransactions > 0 ? eduzzBRL / eduzzTransactions : 0;
  
  const ticketDiffTmb = tmbTicket - hotmartTicket;
  const ticketDiffPercentTmb = hotmartTicket > 0 ? (ticketDiffTmb / hotmartTicket) * 100 : 0;
  
  const ticketDiffEduzz = eduzzTicket - hotmartTicket;
  const ticketDiffPercentEduzz = hotmartTicket > 0 ? (ticketDiffEduzz / hotmartTicket) * 100 : 0;

  const renderDiff = (value: number, showPercent = true) => {
    if (Math.abs(value) < 0.01) {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
    if (value > 0) {
      return (
        <span className="flex items-center text-success text-sm">
          <TrendingUp className="h-4 w-4 mr-1" />
          +{showPercent ? value.toFixed(1) + '%' : formatCurrency(value, 'BRL')}
        </span>
      );
    }
    return (
      <span className="flex items-center text-destructive text-sm">
        <TrendingDown className="h-4 w-4 mr-1" />
        {showPercent ? value.toFixed(1) + '%' : formatCurrency(value, 'BRL')}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Hotmart Column */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-primary" />
          <h3 className="font-semibold text-lg">Hotmart</h3>
        </div>
        
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Total BRL</span>
              </div>
              <span className="text-2xl font-bold">{formatCurrency(hotmartBRL, 'BRL')}</span>
            </div>
            
            {hotmartStats?.totalUSD && hotmartStats.totalUSD > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Total USD</span>
                </div>
                <span className="text-xl font-semibold">{formatCurrency(hotmartStats.totalUSD, 'USD')}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-sm">Transações</span>
              </div>
              <span className="text-xl font-semibold">{formatNumber(hotmartTransactions)}</span>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Receipt className="h-4 w-4" />
                <span className="text-sm">Ticket Médio</span>
              </div>
              <span className="text-xl font-semibold">{formatCurrency(hotmartTicket, 'BRL')}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* TMB Column */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-success" />
          <h3 className="font-semibold text-lg">TMB</h3>
        </div>
        
        <Card className="border-l-4 border-l-success">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Total BRL</span>
              </div>
              <span className="text-2xl font-bold">{formatCurrency(tmbBRL, 'BRL')}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-sm">Transações</span>
              </div>
              <span className="text-xl font-semibold">{formatNumber(tmbTransactions)}</span>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Receipt className="h-4 w-4" />
                <span className="text-sm">Ticket Médio</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold">{formatCurrency(tmbTicket, 'BRL')}</span>
                {renderDiff(ticketDiffPercentTmb)}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Eduzz Column */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'hsl(270, 70%, 50%)' }} />
          <h3 className="font-semibold text-lg">Eduzz</h3>
        </div>
        
        <Card className="border-l-4" style={{ borderLeftColor: 'hsl(270, 70%, 50%)' }}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Total BRL</span>
              </div>
              <span className="text-2xl font-bold">{formatCurrency(eduzzBRL, 'BRL')}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-sm">Transações</span>
              </div>
              <span className="text-xl font-semibold">{formatNumber(eduzzTransactions)}</span>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Receipt className="h-4 w-4" />
                <span className="text-sm">Ticket Médio</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold">{formatCurrency(eduzzTicket, 'BRL')}</span>
                {renderDiff(ticketDiffPercentEduzz)}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="lg:col-span-3"
      >
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex flex-wrap justify-around gap-6 text-center">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Combinado (BRL)</p>
                <p className="text-3xl font-bold">{formatCurrency(totalBRL, 'BRL')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Transações</p>
                <p className="text-3xl font-bold">{formatNumber(totalTransactions)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Participação Hotmart</p>
                <p className="text-3xl font-bold text-primary">
                  {totalBRL > 0 ? ((hotmartBRL / totalBRL) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Participação TMB</p>
                <p className="text-3xl font-bold text-success">
                  {totalBRL > 0 ? ((tmbBRL / totalBRL) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Participação Eduzz</p>
                <p className="text-3xl font-bold" style={{ color: 'hsl(270, 70%, 50%)' }}>
                  {totalBRL > 0 ? ((eduzzBRL / totalBRL) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
