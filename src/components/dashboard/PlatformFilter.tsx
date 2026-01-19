import { cn } from '@/lib/utils';
import { Layers, ShoppingBag, Wallet, CreditCard } from 'lucide-react';
import { PlatformType } from '@/hooks/useCombinedStats';

interface PlatformFilterProps {
  value: PlatformType;
  onChange: (value: PlatformType) => void;
}

const platforms = [
  { value: 'all' as const, label: 'Todas', icon: Layers },
  { value: 'hotmart' as const, label: 'Hotmart', icon: ShoppingBag },
  { value: 'tmb' as const, label: 'TMB', icon: Wallet },
  { value: 'eduzz' as const, label: 'Eduzz', icon: CreditCard },
];

export function PlatformFilter({ value, onChange }: PlatformFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
      <span className="text-sm font-medium text-muted-foreground shrink-0">Plataforma:</span>
      <div className="flex flex-wrap rounded-lg border bg-muted/30 p-1 gap-1">
        {platforms.map((platform) => {
          const Icon = platform.icon;
          const isActive = value === platform.value;
          
          return (
            <button
              key={platform.value}
              onClick={() => onChange(platform.value)}
              className={cn(
                'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              )}
            >
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span>{platform.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
