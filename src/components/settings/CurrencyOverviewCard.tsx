import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, TrendingUp } from 'lucide-react';
import { useCurrencyOverview } from '@/hooks/useCurrencyOverview';
import { Skeleton } from '@/components/ui/skeleton';

export function CurrencyOverviewCard() {
  const { currencies, isLoading, totalTransactions } = useCurrencyOverview();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (currencies.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Coins className="h-5 w-5" />
              Moedas Detectadas
            </CardTitle>
            <CardDescription>
              Nenhuma transação com moeda exótica encontrada
            </CardDescription>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Coins className="h-5 w-5" />
            Moedas Detectadas
          </CardTitle>
          <CardDescription>
            {totalTransactions} transações com conversão de moeda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {currencies.map((group) => (
              <div
                key={group.currency}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono text-sm">
                    {group.currency}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {group.count} transação{group.count !== 1 ? 'ões' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">
                    ${group.totalConverted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
