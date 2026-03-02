import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ExecutiveKPICardProps {
  label: string;
  value: string;
  badge?: string;
  subtitle?: string;
  progress?: number; // 0-100
  onClick?: () => void;
  className?: string;
  tooltipContent?: React.ReactNode;
}

export function ExecutiveKPICard({
  label,
  value,
  badge,
  subtitle,
  progress,
  onClick,
  className,
  tooltipContent,
}: ExecutiveKPICardProps) {
  const cardContent = (
    <div
      className={cn(
        'bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm transition-shadow hover:shadow-md',
        onClick && 'cursor-pointer',
        tooltipContent && 'cursor-help',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        {badge && (
          <Badge variant="outline" className="text-[10px] font-normal h-5 px-2 text-muted-foreground border-border">
            {badge}
          </Badge>
        )}
      </div>
      <p className="text-3xl font-bold tracking-tight text-foreground leading-none mb-1">
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
      )}
      {progress !== undefined && (
        <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
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
