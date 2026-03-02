import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { LucideIcon } from 'lucide-react';

interface ExecutiveKPICardProps {
  label: string;
  value: string;
  badge?: string;
  badgeClassName?: string;
  microLabel?: string;
  subtitle?: string;
  subtitleClassName?: string;
  progress?: number; // 0-100
  progressColor?: string;
  progressHint?: string;
  onClick?: () => void;
  className?: string;
  valueClassName?: string;
  tooltipContent?: React.ReactNode;
  icon?: LucideIcon;
  accentColor?: string;
  iconClassName?: string;
}

export function ExecutiveKPICard({
  label,
  value,
  badge,
  badgeClassName,
  microLabel,
  subtitle,
  subtitleClassName,
  progress,
  progressColor,
  progressHint,
  onClick,
  className,
  valueClassName,
  tooltipContent,
  icon: Icon,
  accentColor,
  iconClassName,
}: ExecutiveKPICardProps) {
  const cardContent = (
    <div
      className={cn(
        'bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        accentColor && 'border-l-4',
        accentColor,
        onClick && 'cursor-pointer',
        tooltipContent && 'cursor-help',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          {microLabel && (
            <span className="text-[10px] tracking-wide uppercase text-muted-foreground block mb-0.5">{microLabel}</span>
          )}
          <span className="text-sm text-muted-foreground font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <Badge variant="outline" className={cn("text-[10px] font-normal h-5 px-2 text-muted-foreground border-border", badgeClassName)}>
              {badge}
            </Badge>
          )}
          {Icon && (
            <div className={cn("p-2 rounded-xl", iconClassName)}>
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
          )}
        </div>
      </div>
      <p className={cn("text-3xl font-bold tracking-tight text-foreground leading-none mb-1", valueClassName)}>
        {value}
      </p>
      {subtitle && (
        <p className={cn("text-xs text-muted-foreground mt-2", subtitleClassName)}>{subtitle}</p>
      )}
      {progress !== undefined && (
        <div className="mt-3">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", progressColor || "bg-primary")}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          {progressHint && (
            <div className="text-xs text-muted-foreground mt-1.5 space-y-0.5">
              {progressHint.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (tooltipContent) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {cardContent}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs bg-popover text-popover-foreground border shadow-lg p-3">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    );
  }

  return cardContent;
}
