import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FilterSheet } from '@/components/filters/FilterSheet';
import { ActiveFiltersDisplay } from '@/components/filters/ActiveFiltersDisplay';
import { useFilter } from '@/contexts/FilterContext';

export function HeaderFilters() {
  const { activeFiltersCount } = useFilter();

  return (
    <div className="flex items-center gap-2">
      {/* Active filters badges - desktop only */}
      <div className="hidden md:block">
        <ActiveFiltersDisplay showClearAll={true} />
      </div>

      {/* Filter button that opens sheet */}
      <FilterSheet
        trigger={
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 relative gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFiltersCount > 0 && (
              <Badge 
                variant="default" 
                className="h-5 min-w-5 px-1.5 text-[10px] flex items-center justify-center"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        }
      />
    </div>
  );
}
