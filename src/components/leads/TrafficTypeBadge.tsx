import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Megaphone, Leaf, Link2 } from 'lucide-react';

export type TrafficType = 'paid' | 'organic' | 'direct';

interface TrafficTypeBadgeProps {
  type: TrafficType | string | null | undefined;
  showLabel?: boolean;
  className?: string;
}

const TRAFFIC_CONFIG: Record<TrafficType, { 
  label: string; 
  icon: typeof Megaphone; 
  className: string;
  tooltip: string;
}> = {
  paid: {
    label: 'Pago',
    icon: Megaphone,
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    tooltip: 'Lead veio de tráfego pago (ads)',
  },
  organic: {
    label: 'Orgânico',
    icon: Leaf,
    className: 'bg-green-500/10 text-green-600 border-green-500/20',
    tooltip: 'Lead veio de tráfego orgânico',
  },
  direct: {
    label: 'Direto',
    icon: Link2,
    className: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    tooltip: 'Lead veio de acesso direto (sem UTMs)',
  },
};

export function TrafficTypeBadge({ type, showLabel = true, className = '' }: TrafficTypeBadgeProps) {
  const trafficType = (type as TrafficType) || 'direct';
  const config = TRAFFIC_CONFIG[trafficType] || TRAFFIC_CONFIG.direct;
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`${config.className} ${className} gap-1 text-xs`}
          >
            <Icon className="h-3 w-3" />
            {showLabel && config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function getTrafficTypeLabel(type: TrafficType | string | null | undefined): string {
  const config = TRAFFIC_CONFIG[type as TrafficType];
  return config?.label || 'Direto';
}
