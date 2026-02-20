import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Handshake, Package } from 'lucide-react';
import { useMyCoproduction, CoproducerProductRate } from '@/hooks/useCoproducers';
import { formatCurrency } from '@/lib/calculations/goalCalculations';

interface CoproducerEarningsCardProps {
  clientId: string | null;
  // Product totals from combined transactions: { productName: totalValue }
  productTotals: Record<string, number>;
}

export function CoproducerEarningsCard({ clientId, productTotals }: CoproducerEarningsCardProps) {
  const { data: myCoproduction, isLoading } = useMyCoproduction(clientId);

  const earnings = useMemo(() => {
    if (!myCoproduction?.rates?.length) return null;

    const breakdown: { product: string; rate: number; total: number; earning: number }[] = [];
    let totalEarning = 0;

    myCoproduction.rates.forEach((rate: CoproducerProductRate) => {
      const productTotal = productTotals[rate.product_name] || 0;
      const earning = productTotal * (rate.rate_percent / 100);
      totalEarning += earning;
      breakdown.push({
        product: rate.product_name,
        rate: rate.rate_percent,
        total: productTotal,
        earning,
      });
    });

    return { breakdown, totalEarning };
  }, [myCoproduction, productTotals]);

  if (isLoading || !earnings) return null;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Handshake className="h-5 w-5 text-primary" />
          Minha Coprodução
          <Badge variant="secondary" className="ml-auto text-lg font-bold">
            {formatCurrency(earnings.totalEarning, 'BRL')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {earnings.breakdown.map(item => (
            <div key={item.product} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Package className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{item.product}</span>
                <span className="text-muted-foreground flex-shrink-0">({item.rate}%)</span>
              </div>
              <span className="font-mono font-medium flex-shrink-0 ml-2">
                {formatCurrency(item.earning, 'BRL')}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
