import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Package, Target, MapPin, Trophy, Medal, Award, Info } from 'lucide-react';
import { TopSalesItem, SalesViewMode } from '@/hooks/useTopSales';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface TopSalesCardProps {
  topItems: TopSalesItem[];
  totalCount: number;
  isLoading?: boolean;
  mode: SalesViewMode;
  onModeChange: (mode: SalesViewMode) => void;
  selectedItem?: string | null;
  onItemClick?: (itemName: string | null) => void;
  showOrigins?: boolean;
  currency?: string;
}

const getRankIcon = (index: number) => {
  switch (index) {
    case 0:
      return <Trophy className="h-4 w-4 text-yellow-500" />;
    case 1:
      return <Medal className="h-4 w-4 text-gray-400" />;
    case 2:
      return <Award className="h-4 w-4 text-amber-600" />;
    default:
      return <span className="w-4 h-4 flex items-center justify-center text-xs font-medium text-muted-foreground">{index + 1}</span>;
  }
};

const getRankBgColor = (index: number) => {
  switch (index) {
    case 0:
      return 'bg-yellow-500/10 border-yellow-500/20';
    case 1:
      return 'bg-gray-400/10 border-gray-400/20';
    case 2:
      return 'bg-amber-600/10 border-amber-600/20';
    default:
      return 'bg-muted/50 border-border';
  }
};

const formatCurrency = (value: number, currency: string = 'BRL') => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function TopSalesCard({ 
  topItems, 
  totalCount, 
  isLoading, 
  mode, 
  onModeChange, 
  selectedItem, 
  onItemClick,
  showOrigins = false,
  currency = 'BRL',
}: TopSalesCardProps) {
  const getModeConfig = () => {
    switch (mode) {
      case 'products':
        return {
          title: 'Produtos',
          icon: Package,
          emptyMessage: 'Nenhum produto encontrado no período selecionado.',
          totalLabel: 'produtos',
          relatedLabel: 'Campanhas',
        };
      case 'campaigns':
        return {
          title: 'Campanhas',
          icon: Target,
          emptyMessage: 'Nenhuma campanha encontrada no período selecionado.',
          totalLabel: 'campanhas',
          relatedLabel: 'Produtos',
        };
      case 'origins':
        return {
          title: 'Origens',
          icon: MapPin,
          emptyMessage: 'Nenhuma origem (SCK) encontrada no período selecionado.',
          totalLabel: 'origens',
          relatedLabel: 'Produtos',
        };
    }
  };

  const config = getModeConfig();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <config.icon className="h-4 w-4 text-primary" />
            Top 5 {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = topItems[0]?.count || 1;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Top 5
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                    <Info className="h-3 w-3" />
                    <span>{totalCount} {config.totalLabel}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total de {config.totalLabel} únicos no período</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <ToggleGroup 
            type="single" 
            value={mode} 
            onValueChange={(value) => value && onModeChange(value as SalesViewMode)}
            size="sm"
          >
            <ToggleGroupItem value="products" aria-label="Ver produtos" className="h-7 px-2">
              <Package className="h-3 w-3" />
              <span className="hidden sm:inline ml-1 text-xs">Produtos</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="campaigns" aria-label="Ver campanhas" className="h-7 px-2">
              <Target className="h-3 w-3" />
              <span className="hidden sm:inline ml-1 text-xs">Campanhas</span>
            </ToggleGroupItem>
            {showOrigins && (
              <ToggleGroupItem value="origins" aria-label="Ver origens" className="h-7 px-2">
                <MapPin className="h-3 w-3" />
                <span className="hidden sm:inline ml-1 text-xs">Origens</span>
              </ToggleGroupItem>
            )}
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {topItems.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            {config.emptyMessage}
          </div>
        ) : (
          <div className="space-y-2">
            {topItems.map((item, index) => {
              const isSelected = selectedItem === item.name;
              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => onItemClick?.(isSelected ? null : item.name)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${getRankBgColor(index)} ${
                    isSelected 
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' 
                      : 'hover:opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getRankIcon(index)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-sm font-medium truncate cursor-pointer">
                                {item.name}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="font-medium">{item.name}</p>
                              {item.related.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {config.relatedLabel}: {item.related.slice(0, 5).join(', ')}
                                  {item.related.length > 5 && ` +${item.related.length - 5} mais`}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                Clique para {isSelected ? 'remover filtro' : 'filtrar vendas'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <div className="flex flex-col items-end gap-0.5">
                          <Badge variant="secondary" className="flex-shrink-0 text-xs">
                            {item.count.toLocaleString('pt-BR')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(item.totalValue, currency)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Progress 
                          value={(item.count / maxCount) * 100} 
                          className="h-1.5 flex-1"
                        />
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
