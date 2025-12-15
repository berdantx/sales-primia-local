import { cn } from '@/lib/utils';
import { Layers, ShoppingBag, Wallet } from 'lucide-react';
import { PlatformType } from '@/hooks/useCombinedStats';

interface PlatformFilterProps {
  value: PlatformType;
  onChange: (value: PlatformType) => void;
}

const platforms = [
  { value: 'all' as const, label: 'Todas', icon: Layers },
  { value: 'hotmart' as const, label: 'Hotmart', icon: ShoppingBag },
  { value: 'tmb' as const, label: 'TMB', icon: Wallet },
];

export function PlatformFilter({ value, onChange }: PlatformFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Plataforma:</span>
      <div className="flex rounded-lg border bg-muted/30 p-1">
        {platforms.map((platform) => {
          const Icon = platform.icon;
          const isActive = value === platform.value;
          
          return (
            <button
              key={platform.value}
              onClick={() => onChange(platform.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              )}
            >
              <Icon className="h-4 w-4" />
              {platform.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
