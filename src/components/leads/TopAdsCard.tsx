import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Megaphone, Target, Trophy, Medal, Award, Info } from 'lucide-react';
import { TopItem, ViewMode } from '@/hooks/useTopAds';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface TopAdsCardProps {
  topItems: TopItem[];
  totalCount: number;
  isLoading?: boolean;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
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

export function TopAdsCard({ topItems, totalCount, isLoading, mode, onModeChange }: TopAdsCardProps) {
  const title = mode === 'ads' ? 'Anúncios' : 'Campanhas';
  const relatedLabel = mode === 'ads' ? 'Campanhas' : 'Anúncios';
  const emptyMessage = mode === 'ads' 
    ? 'Nenhum anúncio (utm_content) encontrado no período selecionado.' 
    : 'Nenhuma campanha (utm_campaign) encontrada no período selecionado.';
  const totalLabel = mode === 'ads' ? 'anúncios' : 'campanhas';

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            Top 5 {title}
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
    <Card>
      <CardHeader className="pb-2">
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
                    <span>{totalCount} {totalLabel}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total de {totalLabel} únicos no período</p>
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
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        {topItems.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-2">
            {topItems.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-lg border ${getRankBgColor(index)}`}
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
                            <p className="text-sm font-medium truncate cursor-help">
                              {item.name}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="font-medium">{item.name}</p>
                            {item.related.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {relatedLabel}: {item.related.slice(0, 5).join(', ')}
                                {item.related.length > 5 && ` +${item.related.length - 5} mais`}
                              </p>
                            )}
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
