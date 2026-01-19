import { Badge } from '@/components/ui/badge';
import { Zap, CreditCard, RefreshCcw, Sparkles, HelpCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BillingTypeBadgeProps {
  billingType?: string | null;
  paymentMethod?: string | null;
  className?: string;
  showPaymentMethod?: boolean;
  recurrenceNumber?: number | null;
  totalInstallments?: number | null;
}

type CategoryKey = 'pix' | 'a_vista' | 'parcelado' | 'recuperador' | 'parc_inteligente' | 'recorrencia' | 'outro';

const BILLING_TYPE_CONFIG: Record<CategoryKey, {
  label: string;
  icon: React.ElementType;
  className: string;
}> = {
  pix: {
    label: 'PIX',
    icon: Zap,
    className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  },
  a_vista: {
    label: 'À Vista',
    icon: CreditCard,
    className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  },
  parcelado: {
    label: 'Parcelado',
    icon: CreditCard,
    className: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
  },
  recuperador: {
    label: 'Recuperação',
    icon: RefreshCcw,
    className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  },
  parc_inteligente: {
    label: 'Parc. Intel.',
    icon: Sparkles,
    className: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  },
  recorrencia: {
    label: 'Recorrência',
    icon: RefreshCcw,
    className: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800',
  },
  outro: {
    label: 'Outro',
    icon: HelpCircle,
    className: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800',
  },
};

const PAYMENT_METHOD_ICONS: Record<string, React.ElementType> = {
  'Pix': Zap,
  'Cartão de Crédito': CreditCard,
  'Boleto': FileText,
  'PayPal': CreditCard,
  'Google Pay': CreditCard,
  'Apple Pay': CreditCard,
};

function getCategoryFromBillingType(billingType?: string | null, paymentMethod?: string | null): CategoryKey {
  if (!billingType) return 'outro';
  
  const type = billingType.toLowerCase();
  
  // PIX (à vista via PIX)
  if ((type.includes('à vista') || type.includes('apenas à vista')) && paymentMethod?.toLowerCase() === 'pix') {
    return 'pix';
  }
  
  // À Vista (cartão)
  if (type.includes('à vista') || type.includes('apenas à vista')) {
    return 'a_vista';
  }
  
  // Parcelamento Padrão
  if (type.includes('parcelamento padrão') || type.includes('parcelamento padrao')) {
    return 'parcelado';
  }
  
  // Recuperador Inteligente
  if (type.includes('recuperador inteligente')) {
    return 'recuperador';
  }
  
  // Parcelamento Inteligente
  if (type.includes('parcelamento inteligente')) {
    return 'parc_inteligente';
  }
  
  // Recorrência
  if (type.includes('recorrência') || type.includes('recorrencia')) {
    return 'recorrencia';
  }
  
  return 'outro';
}

export function BillingTypeBadge({ 
  billingType, 
  paymentMethod, 
  className,
  showPaymentMethod = true,
  recurrenceNumber,
  totalInstallments
}: BillingTypeBadgeProps) {
  const category = getCategoryFromBillingType(billingType, paymentMethod);
  const config = BILLING_TYPE_CONFIG[category];
  const Icon = config.icon;
  
  const PaymentIcon = paymentMethod ? PAYMENT_METHOD_ICONS[paymentMethod] : null;
  
  // Show installment badge for Recuperador Inteligente / Parcelamento Inteligente
  const showInstallmentBadge = recurrenceNumber && totalInstallments && totalInstallments > 1 &&
    (category === 'recuperador' || category === 'parc_inteligente');

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Badge 
        variant="outline" 
        className={cn("flex items-center gap-1 text-xs font-medium", config.className)}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
      
      {/* Installment indicator for Recuperador/Parcelamento Inteligente */}
      {showInstallmentBadge && (
        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
          {recurrenceNumber}/{totalInstallments}
        </Badge>
      )}
      
      {showPaymentMethod && PaymentIcon && category !== 'pix' && !showInstallmentBadge && (
        <Badge variant="outline" className="text-xs px-1.5">
          <PaymentIcon className="h-3 w-3" />
        </Badge>
      )}
    </div>
  );
}

// Export for use in other components
export function getBillingTypeCategory(billingType?: string | null, paymentMethod?: string | null) {
  return getCategoryFromBillingType(billingType, paymentMethod);
}
