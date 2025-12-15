import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CardColorVariant = 'blue' | 'green' | 'orange' | 'purple' | 'gray';

interface ColoredKPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: CardColorVariant;
  delay?: number;
  className?: string;
}

const variantStyles: Record<CardColorVariant, string> = {
  blue: 'bg-primary text-primary-foreground',
  green: 'bg-success text-success-foreground',
  orange: 'bg-warning text-warning-foreground',
  purple: 'bg-gradient-to-r from-[hsl(280,65%,60%)] to-[hsl(270,70%,50%)] text-white',
  gray: 'bg-muted text-muted-foreground',
};

export function ColoredKPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'blue',
  delay = 0,
  className,
}: ColoredKPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1 }}
      className={cn(
        'rounded-lg p-2.5 sm:p-5 shadow-medium transition-transform hover:scale-[1.02]',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
          <p className="text-[10px] sm:text-sm font-medium opacity-90 truncate">{title}</p>
          <p className="text-sm sm:text-2xl font-bold leading-tight break-all">{value}</p>
          {subtitle && (
            <p className="text-[10px] sm:text-sm opacity-80 leading-tight">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="p-1 sm:p-2 rounded-full bg-white/20 shrink-0">
            <Icon className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
