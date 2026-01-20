import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Megaphone, Target, Trophy, Medal, Award, Info, FileText, Sparkles } from 'lucide-react';
import { TopItem, ViewMode } from '@/hooks/useTopAds';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TopAdsCardProps {
  topItems: TopItem[];
  totalCount: number;
  isLoading?: boolean;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  selectedItem?: string | null;
  onItemClick?: (itemName: string | null) => void;
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

const getModeConfig = (mode: ViewMode) => {
  switch (mode) {
    case 'ads':
      return {
        title: 'Anúncios',
        relatedLabel: 'Campanhas',
        emptyMessage: 'Nenhum anúncio (utm_content) encontrado no período selecionado.',
        totalLabel: 'anúncios',
      };
    case 'campaigns':
      return {
        title: 'Campanhas',
        relatedLabel: 'Anúncios',
        emptyMessage: 'Nenhuma campanha (utm_campaign) encontrada no período selecionado.',
        totalLabel: 'campanhas',
      };
    case 'pages':
      return {
        title: 'Páginas',
        relatedLabel: 'Campanhas',
        emptyMessage: 'Nenhuma página de origem encontrada no período selecionado.',
        totalLabel: 'páginas',
      };
  }
};

export function TopAdsCard({ topItems, totalCount, isLoading, mode, onModeChange, selectedItem, onItemClick }: TopAdsCardProps) {
  const config = getModeConfig(mode);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            Top 5 {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = topItems[0]?.lead_count || 1;

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
            onValueChange={(value) => value && onModeChange(value as ViewMode)}
            size="sm"
          >
            <ToggleGroupItem value="ads" aria-label="Ver anúncios" className="h-7 px-2">
              <Megaphone className="h-3 w-3" />
              <span className="hidden sm:inline ml-1 text-xs">Anúncios</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="campaigns" aria-label="Ver campanhas" className="h-7 px-2">
              <Target className="h-3 w-3" />
              <span className="hidden sm:inline ml-1 text-xs">Campanhas</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="pages" aria-label="Ver páginas" className="h-7 px-2">
              <FileText className="h-3 w-3" />
              <span className="hidden sm:inline ml-1 text-xs">Páginas</span>
            </ToggleGroupItem>
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
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium truncate cursor-pointer">
                                  {item.name}
                                </p>
                                {item.isNew && (
                                  <Sparkles className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="font-medium">{item.name}</p>
                              {item.isNew && (
                                <p className="text-xs text-blue-500 mt-1">
                                  🆕 Nova página (menos de 7 dias)
                                </p>
                              )}
                              {item.firstLeadDate && mode === 'pages' && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  1º lead: {format(item.firstLeadDate, "dd/MM/yyyy", { locale: ptBR })}
                                </p>
                              )}
                              {item.related.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {config.relatedLabel}: {item.related.slice(0, 5).join(', ')}
                                  {item.related.length > 5 && ` +${item.related.length - 5} mais`}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                Clique para {isSelected ? 'remover filtro' : 'filtrar leads'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Badge variant="secondary" className="flex-shrink-0 text-xs">
                          {item.lead_count.toLocaleString('pt-BR')}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Progress 
                          value={(item.lead_count / maxCount) * 100} 
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
