import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/calculations/goalCalculations';
import { UnifiedTransaction } from '@/hooks/useCombinedTransactions';

interface TopProductsListProps {
  transactions: UnifiedTransaction[];
  dollarRate?: number;
  limit?: number;
}

interface ProductItem {
  name: string;
  revenue: number;
  count: number;
}

export function TopProductsList({ transactions, dollarRate, limit = 5 }: TopProductsListProps) {
  const products = useMemo(() => {
    const groups: Record<string, ProductItem> = {};
    const rate = dollarRate || 5.5;

    transactions.forEach((t) => {
      const name = t.product || 'Sem produto';
      if (!groups[name]) {
        groups[name] = { name, revenue: 0, count: 0 };
      }
      const value = t.currency === 'USD' ? t.value * rate : t.value;
      groups[name].revenue += value;
      groups[name].count += 1;
    });

    return Object.values(groups)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }, [transactions, dollarRate, limit]);

  if (products.length === 0) return null;

  // Max revenue for proportional bar
  const maxRevenue = products[0]?.revenue || 1;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Package className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />
          <h3 className="text-sm font-semibold text-foreground">Principais Alavancas de Receita</h3>
        </div>
        <Badge variant="outline" className="text-[10px] h-5 px-2 text-muted-foreground">
          Top {Math.min(limit, products.length)}
        </Badge>
      </div>

      <div className="space-y-5">
        {products.map((product, idx) => (
          <div key={product.name}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-bold text-foreground w-4 shrink-0">
                  {idx + 1}.
                </span>
                <span className="text-sm font-medium text-foreground truncate">
                  {product.name}
                </span>
              </div>
              <span className="text-base font-bold text-foreground ml-2 shrink-0 tabular-nums">
                {formatCurrency(product.revenue, 'BRL')}
              </span>
            </div>
            <div className="flex items-center gap-2 pl-6">
              <div className="flex-1 h-0.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/40 transition-all"
                  style={{ width: `${(product.revenue / maxRevenue) * 100}%` }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {formatNumber(product.count)} vendas
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
