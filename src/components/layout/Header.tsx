import { SidebarTrigger } from '@/components/ui/sidebar';
import { HeaderFilters } from './HeaderFilters';
import { NotificationsDropdown } from './NotificationsDropdown';
import { DollarRateIndicator } from '@/components/dashboard/DollarRateIndicator';
import { useDollarRate } from '@/hooks/useDollarRate';
import { useFilter } from '@/contexts/FilterContext';
import { Badge } from '@/components/ui/badge';
import { ClientIndicator } from './ClientIndicator';

export function Header() {
  const { data: dollarRate, isLoading: isLoadingRate, isError: isRateError } = useDollarRate();
  const { platform } = useFilter();

  const platformLabel = platform === 'all' ? 'Todas' : platform === 'hotmart' ? 'Hotmart' : platform === 'tmb' ? 'TMB' : platform === 'cispay' ? 'CIS PAY' : 'Eduzz';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 items-center gap-3 px-3 sm:px-4 md:px-6">
        <SidebarTrigger className="-ml-1" />

        <div className="hidden sm:block h-5 w-px bg-border" />

        {/* Inline context badges */}
        <div className="hidden sm:flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-normal h-6 px-2 text-muted-foreground">
            {platformLabel}
          </Badge>
          <DollarRateIndicator
            rate={dollarRate?.rate}
            source={dollarRate?.source}
            isLoading={isLoadingRate}
            isError={isRateError}
          />
        </div>

        <div className="flex-1" />

        {/* Client Indicator */}
        <div className="hidden sm:block">
          <ClientIndicator />
        </div>

        {/* Filters */}
        <HeaderFilters />

        <NotificationsDropdown />
      </div>
    </header>
  );
}
