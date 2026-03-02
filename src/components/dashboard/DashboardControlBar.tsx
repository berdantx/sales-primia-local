import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Download } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { PlatformFilter } from '@/components/dashboard/PlatformFilter';
import { CurrencyViewToggle, CurrencyView } from '@/components/dashboard/CurrencyViewToggle';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { ExportReportDialog } from '@/components/export/ExportReportDialog';
import { useFilter } from '@/contexts/FilterContext';
import { useClients } from '@/hooks/useClients';
import { useUserRole } from '@/hooks/useUserRole';
import { useClientLeadCounts } from '@/hooks/useClientLeadCounts';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlatformType } from '@/hooks/useCombinedStats';
import { useState } from 'react';

type PeriodFilter = '1d' | '7d' | '30d' | '90d' | '365d' | 'all' | 'custom';

interface RhythmStatus {
  rhythmPercent: number;
  periodPercent: number;
  isOnTrack: boolean;
}

interface DashboardControlBarProps {
  period: PeriodFilter;
  onPeriodChange: (p: PeriodFilter) => void;
  customDateRange?: DateRange;
  onCustomDateRangeChange: (d: DateRange | undefined) => void;
  currencyView: CurrencyView;
  onCurrencyViewChange: (v: CurrencyView) => void;
  canViewFinancials: boolean;
  rhythmStatus?: RhythmStatus | null;
  strategicScore?: number | null;
}

export function DashboardControlBar({
  period,
  onPeriodChange,
  customDateRange,
  onCustomDateRangeChange,
  currencyView,
  onCurrencyViewChange,
  canViewFinancials,
  rhythmStatus,
  strategicScore,
}: DashboardControlBarProps) {
  const [isClientOpen, setIsClientOpen] = useState(false);
  const { clientId, setClientId, platform, setPlatform } = useFilter();
  const { data: clients, isLoading: isLoadingClients } = useClients();
  const { isMaster, isLoading: isLoadingRole } = useUserRole();
  const { data: leadCounts } = useClientLeadCounts();

  const selectedClient = clients?.find(c => c.id === clientId);
  const displayName = selectedClient?.name || 'Todos os clientes';
  const hasMultipleClients = clients && clients.length > 1;
  const showClientSelector = isMaster || hasMultipleClients;

  const riskLabel = useMemo(() => {
    if (!rhythmStatus) return null;
    if (rhythmStatus.rhythmPercent >= 100) return { text: 'No Ritmo', color: 'bg-emerald-500' };
    if (rhythmStatus.rhythmPercent >= 70) return { text: 'Risco Moderado', color: 'bg-amber-500' };
    return { text: 'Risco Alto', color: 'bg-red-500' };
  }, [rhythmStatus]);

  return (
    <div className="border-b border-border/60 bg-muted/30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4">
      <div className="max-w-[1400px] mx-auto space-y-5">
        {/* Row 1: Context + Status */}
        <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
          {/* ZONA 1 — CONTEXTO */}
           <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight whitespace-nowrap">
                Centro de Comando
              </h1>

              {showClientSelector && clients && clients.length > 0 && !isLoadingClients && !isLoadingRole && (
                <>
                  <span className="text-muted-foreground/30 text-lg font-light">—</span>
                  <DropdownMenu open={isClientOpen} onOpenChange={setIsClientOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-primary hover:text-primary/80 hover:bg-transparent font-bold gap-1.5 text-xl sm:text-2xl"
                      >
                        {displayName}
                        <motion.span
                          animate={{ rotate: isClientOpen ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </motion.span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 bg-popover">
                      {isMaster && (
                        <>
                          <DropdownMenuItem
                            onClick={() => setClientId(null)}
                            className={`flex items-center justify-between transition-all duration-150 hover:bg-primary/10 hover:text-primary hover:pl-4 ${!clientId ? 'bg-primary/5 text-primary font-medium' : ''}`}
                          >
                            <span>Todos os clientes</span>
                            {!clientId && <Check className="h-4 w-4 text-primary" />}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      {clients.map((client) => {
                        const leadCount = leadCounts?.[client.id] || 0;
                        const isSelected = clientId === client.id;
                        return (
                          <DropdownMenuItem
                            key={client.id}
                            onClick={() => setClientId(client.id)}
                            className={`flex items-center justify-between transition-all duration-150 hover:bg-primary/10 hover:text-primary hover:pl-4 ${isSelected ? 'bg-primary/5 text-primary font-medium' : ''}`}
                          >
                            <span className="flex items-center gap-2">
                              {client.name}
                              {isSelected && <Check className="h-4 w-4 text-primary" />}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                              <Users className="h-3 w-3" />
                              {leadCount}
                            </span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
            <p className="text-sm sm:text-base text-muted-foreground/80 mt-1 font-medium tracking-wide">
              Infraestrutura estratégica para decisões de alto impacto
            </p>
          </div>

          {/* ZONA 3 — STATUS (right side) */}
          <div className="flex items-center flex-shrink-0">
            {rhythmStatus && riskLabel && (
              <div className={`hidden md:flex items-center gap-4 px-6 py-3 rounded-lg border min-w-[240px] ${
                riskLabel.color === 'bg-emerald-500' 
                  ? 'bg-emerald-50/40 border-emerald-200/40' 
                  : riskLabel.color === 'bg-amber-500' 
                    ? 'bg-amber-50/40 border-amber-200/40' 
                    : 'bg-red-50/40 border-red-200/40'
              }`}>
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${riskLabel.color} ring-2 ring-offset-1 ring-offset-background ${
                  riskLabel.color === 'bg-emerald-500' ? 'ring-emerald-500/20' : 
                  riskLabel.color === 'bg-amber-500' ? 'ring-amber-500/20' : 'ring-red-500/20'
                }`} />
                <div className="flex flex-col leading-tight">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-extrabold text-foreground">{riskLabel.text}</span>
                    <span className="text-sm font-extrabold text-foreground">
                      {rhythmStatus.rhythmPercent.toFixed(0)}%
                    </span>
                    <span className="text-sm font-extrabold text-foreground">do ritmo</span>
                    {strategicScore != null && (
                      <>
                        <span className="text-muted-foreground/30 mx-1">|</span>
                        <span className="text-sm font-extrabold text-foreground">Score {strategicScore}</span>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {rhythmStatus.periodPercent}% do período decorrido
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Filter groups + Export */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
          {/* PERÍODO */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium hidden sm:block">Período</span>
            <div className="flex items-center gap-2">
              <Select value={period} onValueChange={(v) => onPeriodChange(v as PeriodFilter)}>
                <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs bg-background border-border/60 rounded-lg">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Último dia</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                  <SelectItem value="365d">Último ano</SelectItem>
                  <SelectItem value="all">Tudo</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
              {period === 'custom' && (
                <DateRangePicker
                  dateRange={customDateRange}
                  onDateRangeChange={onCustomDateRangeChange}
                  className="w-[220px]"
                />
              )}
            </div>
          </div>

          <div className="hidden sm:block h-8 w-px bg-border/40" />

          {/* PLATAFORMAS */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium hidden sm:block">Plataforma</span>
            <PlatformFilter value={platform} onChange={setPlatform} />
          </div>

          {canViewFinancials && (
            <>
              <div className="hidden sm:block h-8 w-px bg-border/40" />

              {/* MOEDA */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium hidden sm:block">Moeda</span>
                <CurrencyViewToggle value={currencyView} onChange={onCurrencyViewChange} />
              </div>
            </>
          )}

          {/* Spacer + Export */}
          <div className="hidden sm:flex sm:flex-1" />
          <ExportReportDialog defaultClientId={clientId} />
        </div>
      </div>
    </div>
  );
}
