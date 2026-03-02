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
        'bg-card border border-border/80 rounded-xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05)]',
        accentColor && 'border-t-[3px]',
        accentColor,
        onClick && 'cursor-pointer',
        tooltipContent && 'cursor-help',
        className
      )}
      onClick={onClick}
    >
      <div className="mb-3">
        {microLabel && (
          <span className="text-[10px] tracking-wide uppercase text-muted-foreground block mb-1">{microLabel}</span>
        )}
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={cn("p-1.5 rounded-lg flex-shrink-0", iconClassName)}>
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            </div>
          )}
          <span className="text-sm text-foreground font-semibold">{label}</span>
        </div>
      </div>
      <p className={cn("text-2xl font-extrabold tracking-tight text-foreground leading-none mb-1", valueClassName)}>
        {value}
      </p>
      {subtitle && (
        <p className={cn("text-xs text-muted-foreground mt-2", subtitleClassName)}>{subtitle}</p>
      )}
      {badge && (
        <Badge variant="outline" className={cn("text-[10px] font-normal h-5 px-1.5 text-muted-foreground border-border whitespace-nowrap mt-2", badgeClassName)}>
          {badge}
        </Badge>
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
