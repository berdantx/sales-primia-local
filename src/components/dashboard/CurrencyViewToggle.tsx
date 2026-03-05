import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DollarSign, Layers, CircleDollarSign } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type CurrencyView = 'brl-only' | 'usd-only';

interface CurrencyViewToggleProps {
  value: CurrencyView;
  onChange: (value: CurrencyView) => void;
  className?: string;
}

export function CurrencyViewToggle({ value, onChange, className }: CurrencyViewToggleProps) {
  return (
    <TooltipProvider>
      <ToggleGroup 
        type="single" 
        value={value} 
        onValueChange={(v) => v && onChange(v as CurrencyView)}
        className={className}
      >

        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="brl-only" aria-label="Apenas BRL" className="h-8 px-2 sm:px-3">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5 text-xs">Apenas BRL</span>
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>
            <p>Apenas vendas em Reais</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="usd-only" aria-label="Tudo em USD" className="h-8 px-2 sm:px-3">
              <CircleDollarSign className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5 text-xs">Tudo em USD</span>
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>
            <p>Todos os valores convertidos para USD</p>
          </TooltipContent>
        </Tooltip>

      </ToggleGroup>
    </TooltipProvider>
  );
}
