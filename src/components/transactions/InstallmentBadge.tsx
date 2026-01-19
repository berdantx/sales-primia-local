import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Hash } from 'lucide-react';

interface InstallmentBadgeProps {
  recurrenceNumber: number | null | undefined;
  totalInstallments: number | null | undefined;
  billingType: string | null | undefined;
  showIcon?: boolean;
  compact?: boolean;
}

export function InstallmentBadge({
  recurrenceNumber,
  totalInstallments,
  billingType,
  showIcon = false,
  compact = false,
}: InstallmentBadgeProps) {
  // Só mostrar para tipos de parcelamento inteligente com múltiplas parcelas
  const isInstallmentType = 
    billingType?.toLowerCase().includes('inteligente') || 
    billingType?.toLowerCase().includes('recuperador');
  
  if (!isInstallmentType || !totalInstallments || totalInstallments <= 1) {
    return null;
  }
  
  const hasRecurrenceNumber = recurrenceNumber !== null && recurrenceNumber !== undefined;
  const remaining = hasRecurrenceNumber ? totalInstallments - recurrenceNumber : null;
  
  const badgeContent = hasRecurrenceNumber 
    ? compact 
      ? `${recurrenceNumber}/${totalInstallments}`
      : `Parcela ${recurrenceNumber}/${totalInstallments}`
    : compact 
      ? `${totalInstallments}x`
      : `${totalInstallments} parcelas`;
  
  const tooltipContent = hasRecurrenceNumber
    ? `Parcela ${recurrenceNumber} de ${totalInstallments} (${remaining} restantes)`
    : `Total de ${totalInstallments} parcelas mensais`;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 cursor-default whitespace-nowrap"
          >
            {showIcon && <Hash className="h-3 w-3 mr-1" />}
            {badgeContent}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
