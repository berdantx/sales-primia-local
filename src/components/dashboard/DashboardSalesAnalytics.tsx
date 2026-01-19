import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, BarChart3, TrendingUp } from 'lucide-react';
import { SalesComparisonChart } from '@/components/sales/SalesComparisonChart';
import { SalesTrendChart } from '@/components/sales/SalesTrendChart';
import { TopSalesCard } from '@/components/sales/TopSalesCard';
import { PeriodComparisonSelector, ComparisonType, getComparisonDateRange } from '@/components/sales/PeriodComparisonSelector';
import { useTopSales, SalesViewMode } from '@/hooks/useTopSales';
import { SalesGroupBy } from '@/hooks/useSalesTrend';
import { useCombinedTransactions, UnifiedTransaction } from '@/hooks/useCombinedTransactions';
import { PlatformType } from '@/hooks/useCombinedStats';
import { DateRange } from 'react-day-picker';

type SalesValueMode = 'count' | 'value';

interface DashboardSalesAnalyticsProps {
  startDate?: Date;
  endDate?: Date;
  clientId?: string | null;
  platform: PlatformType;
}

export function DashboardSalesAnalytics({
  startDate,
  endDate,
  clientId,
  platform,
}: DashboardSalesAnalyticsProps) {
  // Analytics state
  const [topMode, setTopMode] = useState<SalesViewMode>('products');
  const [trendGroupBy, setTrendGroupBy] = useState<SalesGroupBy>('day');
  const [chartTab, setChartTab] = useState<'daily' | 'trend'>('daily');
  const [chartValueMode, setChartValueMode] = useState<SalesValueMode>('value');
  const [trendValueMode, setTrendValueMode] = useState<SalesValueMode>('count');
  const [selectedTopItem, setSelectedTopItem] = useState<string | null>(null);

  // Period comparison state
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonType, setComparisonType] = useState<ComparisonType>('previous-period');
  const [customComparisonRange, setCustomComparisonRange] = useState<DateRange | undefined>();

  // Fetch combined transactions for current period
  const { transactions, isLoading } = useCombinedTransactions({
    startDate,
    endDate,
    clientId,
    platform,
  });

  // Calculate comparison date range
  const comparisonDateRange = useMemo(() => {
    if (!showComparison || !startDate || !endDate) return undefined;
    return getComparisonDateRange(
      { from: startDate, to: endDate },
      comparisonType,
      customComparisonRange
    );
  }, [showComparison, startDate, endDate, comparisonType, customComparisonRange]);

  // Fetch comparison period transactions
  const { transactions: comparisonTransactions, isLoading: isLoadingComparison } = useCombinedTransactions(
    showComparison && comparisonDateRange ? {
      startDate: comparisonDateRange.startDate,
      endDate: comparisonDateRange.endDate,
      clientId,
      platform,
    } : undefined
  );

  // Filter by selected top item if any
  const filteredTransactions = useMemo(() => {
    if (!selectedTopItem) return transactions;
    
    return transactions.filter((t) => {
      if (topMode === 'products') {
        return t.product === selectedTopItem;
      } else if (topMode === 'campaigns') {
        return t.utm_campaign === selectedTopItem;
      } else {
        return t.sck_code === selectedTopItem;
      }
    });
  }, [transactions, selectedTopItem, topMode]);

  // Filter comparison transactions by same criteria
  const filteredComparisonTransactions = useMemo(() => {
    if (!selectedTopItem || !comparisonTransactions) return comparisonTransactions || [];
    
    return comparisonTransactions.filter((t) => {
      if (topMode === 'products') {
        return t.product === selectedTopItem;
      } else if (topMode === 'campaigns') {
        return t.utm_campaign === selectedTopItem;
      } else {
        return t.sck_code === selectedTopItem;
      }
    });
  }, [comparisonTransactions, selectedTopItem, topMode]);

  // Top 5 sales data - use different fields based on platform
  const { topItems, totalCount } = useTopSales<UnifiedTransaction>({
    transactions: filteredTransactions,
    limit: 5,
    mode: topMode,
    productField: 'product',
    campaignField: 'utm_campaign',
    originField: 'sck_code',
    valueField: 'value',
  });

  // Calculate sales by day from filtered data
  const filteredSalesByDay = useMemo(() => {
    const byDay: Record<string, { count: number; value: number }> = {};
    
    filteredTransactions.forEach((t) => {
      if (!t.date) return;
      const dateKey = t.date.split('T')[0];
      if (!byDay[dateKey]) {
        byDay[dateKey] = { count: 0, value: 0 };
      }
      byDay[dateKey].count += 1;
      byDay[dateKey].value += t.value;
    });

    return byDay;
  }, [filteredTransactions]);

  // Calculate comparison sales by day
  const comparisonSalesByDay = useMemo(() => {
    if (!filteredComparisonTransactions || filteredComparisonTransactions.length === 0) return undefined;
    
    const byDay: Record<string, { count: number; value: number }> = {};
    
    filteredComparisonTransactions.forEach((t) => {
      if (!t.date) return;
      const dateKey = t.date.split('T')[0];
      if (!byDay[dateKey]) {
        byDay[dateKey] = { count: 0, value: 0 };
      }
      byDay[dateKey].count += 1;
      byDay[dateKey].value += t.value;
    });

    return byDay;
  }, [filteredComparisonTransactions]);

  // Get top item names for trend chart
  const topItemNames = useMemo(() => topItems.map((i) => i.name), [topItems]);

  // Handle mode change - clear selection when changing mode
  const handleModeChange = (mode: SalesViewMode) => {
    setTopMode(mode);
    setSelectedTopItem(null);
  };

  // Handle item click for filtering
  const handleItemClick = (itemName: string) => {
    setSelectedTopItem(prev => prev === itemName ? null : itemName);
  };

  // Mode options based on platform
  const showOrigins = platform === 'hotmart' || platform === 'all';

  // Get comparison label
  const getComparisonLabel = () => {
    if (comparisonType === 'previous-period') return 'Período anterior';
    if (comparisonType === 'previous-year') return 'Ano anterior';
    return 'Período customizado';
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        <Card className="lg:col-span-2 h-[420px] animate-pulse bg-muted/50" />
        <Card className="h-[420px] animate-pulse bg-muted/50" />
      </motion.div>
    );
  }

  if (transactions.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="space-y-4"
    >
      {/* Selected filter indicator */}
      {selectedTopItem && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtrado por:</span>
          <Badge variant="secondary" className="gap-1.5">
            {selectedTopItem}
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => setSelectedTopItem(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        </div>
      )}

      {/* Period comparison selector (when comparison is active) */}
      {showComparison && startDate && endDate && (
        <PeriodComparisonSelector
          currentDateRange={{ from: startDate, to: endDate }}
          comparisonType={comparisonType}
          onComparisonTypeChange={setComparisonType}
          customComparisonRange={customComparisonRange}
          onCustomComparisonRangeChange={setCustomComparisonRange}
          isEnabled={showComparison}
          onToggle={() => setShowComparison(false)}
        />
      )}

      {/* Analytics grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Charts - 2/3 width */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                {chartTab === 'daily' ? (
                  <BarChart3 className="h-4 w-4 text-primary" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-primary" />
                )}
                Análise de Vendas Consolidadas
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={chartTab} onValueChange={(v) => setChartTab(v as 'daily' | 'trend')}>
              <TabsList className="mb-4">
                <TabsTrigger value="daily">Vendas por Dia</TabsTrigger>
                <TabsTrigger value="trend">Evolução {topMode === 'products' ? 'Produtos' : topMode === 'campaigns' ? 'Campanhas' : 'Origens'}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="daily" className="mt-0">
                <SalesComparisonChart
                  currentData={filteredSalesByDay}
                  previousData={showComparison ? comparisonSalesByDay : undefined}
                  isLoading={isLoading || isLoadingComparison}
                  embedded
                  valueMode={chartValueMode}
                  onValueModeChange={setChartValueMode}
                  currency="BRL"
                  showComparison={showComparison}
                  onComparisonToggle={() => setShowComparison(!showComparison)}
                  currentLabel="Atual"
                  comparisonLabel={getComparisonLabel()}
                />
              </TabsContent>
              
              <TabsContent value="trend" className="mt-0">
                <SalesTrendChart<UnifiedTransaction>
                  transactions={filteredTransactions}
                  topItemNames={topItemNames}
                  mode={topMode}
                  groupBy={trendGroupBy}
                  onGroupByChange={setTrendGroupBy}
                  productField="product"
                  campaignField="utm_campaign"
                  originField="sck_code"
                  dateField="date"
                  valueField="value"
                  embedded
                  valueMode={trendValueMode}
                  onValueModeChange={setTrendValueMode}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Top 5 Card - 1/3 width */}
        <TopSalesCard
          topItems={topItems}
          totalCount={totalCount}
          isLoading={isLoading}
          mode={topMode}
          onModeChange={handleModeChange}
          selectedItem={selectedTopItem}
          onItemClick={handleItemClick}
          showOrigins={showOrigins}
        />
      </div>
    </motion.div>
  );
}
