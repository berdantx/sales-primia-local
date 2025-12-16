import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DollarSign, Layers, SplitSquareVertical } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type CurrencyView = 'combined' | 'brl-only' | 'separated';

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
            <ToggleGroupItem value="combined" aria-label="Valores combinados" className="h-8 px-2 sm:px-3">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5 text-xs">Combinado</span>
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>
            <p>BRL + USD convertido</p>
          </TooltipContent>
        </Tooltip>

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
            <ToggleGroupItem value="separated" aria-label="Separado por moeda" className="h-8 px-2 sm:px-3">
              <SplitSquareVertical className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5 text-xs">Separado</span>
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>
            <p>Cards separados por moeda</p>
          </TooltipContent>
        </Tooltip>
      </ToggleGroup>
    </TooltipProvider>
  );
}
