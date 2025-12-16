import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DollarSign, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DollarRateIndicatorProps {
  rate: number | undefined;
  source: string | undefined;
  isLoading: boolean;
  isError: boolean;
  className?: string;
}

export function DollarRateIndicator({ 
  rate, 
  source, 
  isLoading, 
  isError,
  className 
}: DollarRateIndicatorProps) {
  if (isLoading) {
    return (
      <Badge variant="secondary" className={className}>
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        <span className="text-xs">Carregando cotação...</span>
      </Badge>
    );
  }

  if (isError || !rate) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className={className}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              <span className="text-xs">Cotação indisponível</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Não foi possível obter a cotação do dólar</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const isFallback = source === 'fallback';
  const formattedRate = `R$ ${rate.toFixed(2)}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={isFallback ? 'outline' : 'secondary'} 
            className={`${className} ${isFallback ? 'border-warning text-warning' : ''}`}
          >
            {isFallback ? (
              <AlertTriangle className="h-3 w-3 mr-1 text-warning" />
            ) : (
              <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
            )}
            <DollarSign className="h-3 w-3" />
            <span className="text-xs">{formattedRate}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isFallback 
              ? `Cotação aproximada (${formattedRate})` 
              : `Cotação USD/BRL: ${formattedRate} (${source})`
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
