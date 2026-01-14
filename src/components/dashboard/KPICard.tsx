import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  delay?: number;
  onClick?: () => void;
}

export function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  className,
  delay = 0,
  onClick
}: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.08, duration: 0.3 }}
    >
      <Card 
        className={cn(
          "group relative overflow-hidden transition-all duration-300",
          "hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
          "border-border/50",
          onClick && "cursor-pointer",
          className
        )}
        onClick={onClick}
      >
        {/* Subtle gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <CardContent className="pt-3 pb-3 sm:pt-5 sm:pb-5 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1 sm:space-y-1.5 min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
              <motion.p 
                className="text-base sm:text-2xl font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay * 0.08 + 0.15 }}
              >
                {value}
              </motion.p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
              {trend && (
                <div className={cn(
                  "flex items-center gap-1 text-xs font-semibold",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}>
                  <span>{trend.isPositive ? '↑' : '↓'}</span>
                  <span>{Math.abs(trend.value)}%</span>
                </div>
              )}
            </div>
            <div className="p-1.5 sm:p-2.5 bg-primary/10 rounded-lg sm:rounded-xl group-hover:bg-primary/15 transition-colors duration-300">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
