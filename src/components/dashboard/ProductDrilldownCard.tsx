import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Package, Globe, Banknote } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/calculations/goalCalculations';
import { UnifiedTransaction } from '@/hooks/useCombinedTransactions';

interface ProductDrilldownCardProps {
  transactions: UnifiedTransaction[];
  dollarRate?: number;
  limit?: number;
}

interface ProductGroup {
  product: string;
  totalBRL: number;
  totalUSD: number;
  count: number;
  countries: Record<string, { totalBRL: number; totalUSD: number; count: number }>;
}

export function ProductDrilldownCard({ transactions, dollarRate, limit = 5 }: ProductDrilldownCardProps) {
  const productGroups = useMemo(() => {
    const groups: Record<string, ProductGroup> = {};

    transactions.forEach((t) => {
      const product = t.product || 'Sem produto';
      if (!groups[product]) {
        groups[product] = { product, totalBRL: 0, totalUSD: 0, count: 0, countries: {} };
      }
      const g = groups[product];
      g.count += 1;

      if (t.currency === 'USD') {
        g.totalUSD += t.value;
      } else {
        g.totalBRL += t.value;
      }

      const country = t.country || 'Não informado';
      if (!g.countries[country]) {
        g.countries[country] = { totalBRL: 0, totalUSD: 0, count: 0 };
      }
      g.countries[country].count += 1;
      if (t.currency === 'USD') {
        g.countries[country].totalUSD += t.value;
      } else {
        g.countries[country].totalBRL += t.value;
      }
    });

    return Object.values(groups)
      .sort((a, b) => {
        const rate = dollarRate || 5.5;
        const totalA = a.totalBRL + a.totalUSD * rate;
        const totalB = b.totalBRL + b.totalUSD * rate;
        return totalB - totalA;
      })
      .slice(0, limit);
  }, [transactions, dollarRate, limit]);

  if (productGroups.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Top {Math.min(limit, productGroups.length)} Produtos
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion type="multiple" className="w-full">
          {productGroups.map((group, idx) => {
            const rate = dollarRate || 5.5;
            const totalCombined = group.totalBRL + group.totalUSD * rate;
            const countries = Object.entries(group.countries)
              .sort((a, b) => {
                const tA = a[1].totalBRL + a[1].totalUSD * rate;
                const tB = b[1].totalBRL + b[1].totalUSD * rate;
                return tB - tA;
              });

            return (
              <AccordionItem key={group.product} value={`product-${idx}`}>
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center justify-between w-full mr-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-muted-foreground w-5">{idx + 1}.</span>
                      <span className="text-sm font-medium truncate">{group.product}</span>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {formatNumber(group.count)}
                      </Badge>
                    </div>
                    <span className="text-sm font-bold text-primary ml-2 shrink-0">
                      {formatCurrency(totalCombined, 'BRL')}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pl-7">
                    {/* Currency summary */}
                    <div className="flex flex-wrap gap-3 pb-2 border-b">
                      {group.totalBRL > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Banknote className="h-3 w-3 text-green-600" />
                          <span className="text-muted-foreground">BRL:</span>
                          <span className="font-medium">{formatCurrency(group.totalBRL, 'BRL')}</span>
                        </div>
                      )}
                      {group.totalUSD > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Banknote className="h-3 w-3 text-blue-600" />
                          <span className="text-muted-foreground">USD:</span>
                          <span className="font-medium">{formatCurrency(group.totalUSD, 'USD')}</span>
                        </div>
                      )}
                    </div>

                    {/* Country breakdown */}
                    {countries.map(([country, stats]) => (
                      <div key={country} className="flex items-center justify-between text-xs py-1">
                        <div className="flex items-center gap-1.5">
                          <Globe className="h-3 w-3 text-muted-foreground" />
                          <span>{country}</span>
                          <span className="text-muted-foreground">({formatNumber(stats.count)})</span>
                        </div>
                        <div className="flex gap-3">
                          {stats.totalBRL > 0 && (
                            <span className="text-green-700 dark:text-green-400">{formatCurrency(stats.totalBRL, 'BRL')}</span>
                          )}
                          {stats.totalUSD > 0 && (
                            <span className="text-blue-700 dark:text-blue-400">{formatCurrency(stats.totalUSD, 'USD')}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
