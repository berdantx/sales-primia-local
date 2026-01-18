import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber } from '@/lib/calculations/goalCalculations';
import { Zap, CreditCard, RefreshCcw, Sparkles, HelpCircle } from 'lucide-react';
import { SalesBreakdownItem } from '@/hooks/useSalesBreakdown';

interface SalesBreakdownCardsProps {
  data: SalesBreakdownItem[];
  onCategoryClick?: (category: string) => void;
  selectedCategory?: string | null;
  isLoading?: boolean;
}

const CATEGORY_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  description: string;
}> = {
  pix: {
    label: 'PIX',
    icon: Zap,
    colorClass: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-50 dark:bg-green-950/30',
    borderClass: 'border-green-200 dark:border-green-800',
    description: 'Vendas à vista via PIX',
  },
  a_vista: {
    label: 'Cartão à Vista',
    icon: CreditCard,
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    borderClass: 'border-blue-200 dark:border-blue-800',
    description: 'Vendas à vista no cartão',
  },
  parcelado: {
    label: 'Parcelado',
    icon: CreditCard,
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    bgClass: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderClass: 'border-indigo-200 dark:border-indigo-800',
    description: 'Parcelamento padrão (operadora paga integral)',
  },
  recuperador: {
    label: 'Recuperação',
    icon: RefreshCcw,
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    borderClass: 'border-amber-200 dark:border-amber-800',
    description: 'Recuperador Inteligente (pagamento mensal)',
  },
  parc_inteligente: {
    label: 'Parc. Intel.',
    icon: Sparkles,
    colorClass: 'text-purple-600 dark:text-purple-400',
    bgClass: 'bg-purple-50 dark:bg-purple-950/30',
    borderClass: 'border-purple-200 dark:border-purple-800',
    description: 'Parcelamento Inteligente (pagamento mensal)',
  },
  outro: {
    label: 'Outros',
    icon: HelpCircle,
    colorClass: 'text-gray-600 dark:text-gray-400',
    bgClass: 'bg-gray-50 dark:bg-gray-950/30',
    borderClass: 'border-gray-200 dark:border-gray-800',
    description: 'Outros tipos de venda',
  },
};

// Order to display categories
const CATEGORY_ORDER = ['pix', 'a_vista', 'parcelado', 'recuperador', 'parc_inteligente', 'outro'];

export function SalesBreakdownCards({ 
  data, 
  onCategoryClick, 
  selectedCategory,
  isLoading 
}: SalesBreakdownCardsProps) {
  // Sort data by our predefined order
  const sortedData = [...data].sort((a, b) => {
    const orderA = CATEGORY_ORDER.indexOf(a.category);
    const orderB = CATEGORY_ORDER.indexOf(b.category);
    return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-3">
              <div className="h-4 bg-muted rounded w-16 mb-2" />
              <div className="h-6 bg-muted rounded w-24 mb-1" />
              <div className="h-3 bg-muted rounded w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (sortedData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Vendas por Tipo</h3>
        {selectedCategory && (
          <Badge 
            variant="outline" 
            className="cursor-pointer hover:bg-muted"
            onClick={() => onCategoryClick?.('')}
          >
            Limpar filtro ✕
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {sortedData.map((item, index) => {
          const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.outro;
          const Icon = config.icon;
          const isSelected = selectedCategory === item.category;
          const hasProjection = item.total_projected_brl > item.total_real_brl;

          return (
            <motion.div
              key={item.category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  isSelected 
                    ? `ring-2 ring-primary ${config.bgClass}` 
                    : `hover:${config.bgClass} ${config.borderClass}`
                }`}
                onClick={() => onCategoryClick?.(item.category)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-md ${config.bgClass}`}>
                      <Icon className={`h-3.5 w-3.5 ${config.colorClass}`} />
                    </div>
                    <span className={`text-xs font-medium ${config.colorClass}`}>
                      {config.label}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-lg font-bold leading-none">
                      {formatCurrency(item.total_real_brl, 'BRL')}
                    </p>
                    
                    {hasProjection && (
                      <p className="text-xs text-muted-foreground">
                        Projeção: {formatCurrency(item.total_projected_brl, 'BRL')}
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(item.total_transactions)} {item.total_transactions === 1 ? 'venda' : 'vendas'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
