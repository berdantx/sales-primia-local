import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, Webhook } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SourceBadgeProps {
  source: string | null;
  className?: string;
}

export function SourceBadge({ source, className }: SourceBadgeProps) {
  const isWebhook = source === 'webhook';
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "text-xs font-normal gap-1",
        isWebhook 
          ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" 
          : "border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
        className
      )}
    >
      {isWebhook ? (
        <>
          <Webhook className="h-3 w-3" />
          <span>Webhook</span>
        </>
      ) : (
        <>
          <FileSpreadsheet className="h-3 w-3" />
          <span>CSV</span>
        </>
      )}
    </Badge>
  );
}
