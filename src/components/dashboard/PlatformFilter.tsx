import { cn } from '@/lib/utils';
import { Layers, ShoppingBag, Wallet, CreditCard, GraduationCap } from 'lucide-react';
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
  { value: 'cispay' as const, label: 'CIS PAY', icon: GraduationCap },
];

export function PlatformFilter({ value, onChange }: PlatformFilterProps) {
  return (
    <div className="flex flex-wrap rounded-lg border border-border/60 bg-muted/30 p-0.5 gap-0.5">
      {platforms.map((platform) => {
        const Icon = platform.icon;
        const isActive = value === platform.value;
        
        return (
          <button
            key={platform.value}
            onClick={() => onChange(platform.value)}
            className={cn(
              'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap',
              isActive
                ? 'bg-background text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{platform.label}</span>
          </button>
        );
      })}
    </div>
  );
}
