import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Plus, Settings, FolderOpen, Check } from 'lucide-react';
import { FilterView, useFilterViews } from '@/hooks/useFilterViews';
import { SaveFilterViewDialog } from './SaveFilterViewDialog';
import { ManageFilterViewsDialog } from './ManageFilterViewsDialog';
import { parseISO } from 'date-fns';

type PeriodFilter = '1d' | '7d' | '30d' | '90d' | '365d' | 'all' | 'custom';

interface SavedFilterViewsProps {
  currentPeriod: PeriodFilter;
  currentCustomDateRange?: DateRange;
  currentBillingType: string | null;
  currentPaymentMethod: string | null;
  currentSckCode: string | null;
  selectedViewId: string | null;
  onSelectView: (view: FilterView) => void;
  onClearView: () => void;
}

export function SavedFilterViews({
  currentPeriod,
  currentCustomDateRange,
  currentBillingType,
  currentPaymentMethod,
  currentSckCode,
  selectedViewId,
  onSelectView,
  onClearView,
}: SavedFilterViewsProps) {
  const { data: views = [], isLoading } = useFilterViews();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);

  const hasActiveFilters = currentPeriod !== 'all' || 
    currentBillingType || 
    currentPaymentMethod || 
    currentSckCode;

  const isViewModified = (view: FilterView) => {
    if (!selectedViewId || selectedViewId !== view.id) return false;
    
    if (view.period !== currentPeriod) return true;
    if (view.billing_type !== currentBillingType) return true;
    if (view.payment_method !== currentPaymentMethod) return true;
    if (view.sck_code !== currentSckCode) return true;
    
    if (view.period === 'custom') {
      const viewStart = view.custom_date_start ? parseISO(view.custom_date_start) : null;
      const viewEnd = view.custom_date_end ? parseISO(view.custom_date_end) : null;
      if (viewStart?.getTime() !== currentCustomDateRange?.from?.getTime()) return true;
      if (viewEnd?.getTime() !== currentCustomDateRange?.to?.getTime()) return true;
    }
    
    return false;
  };

  if (isLoading) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FolderOpen className="h-4 w-4" />
          <span>Views:</span>
        </div>

        {views.length === 0 && !hasActiveFilters && (
          <span className="text-sm text-muted-foreground italic">
            Nenhuma view salva
          </span>
        )}

        {views.map((view) => {
          const isSelected = selectedViewId === view.id;
          const modified = isViewModified(view);
          
          return (
            <Badge
              key={view.id}
              variant={isSelected ? 'default' : 'outline'}
              className={`cursor-pointer hover:bg-primary/10 transition-colors ${
                isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
              }`}
              onClick={() => isSelected ? onClearView() : onSelectView(view)}
            >
              {view.is_favorite && (
                <Star className="h-3 w-3 mr-1 fill-amber-500 text-amber-500" />
              )}
              {isSelected && <Check className="h-3 w-3 mr-1" />}
              {view.name}
              {modified && <span className="ml-1 text-xs opacity-60">(mod)</span>}
            </Badge>
          );
        })}

        {hasActiveFilters && !selectedViewId && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            onClick={() => setSaveDialogOpen(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Salvar atual
          </Button>
        )}

        {views.length > 0 && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setManageDialogOpen(true)}
            title="Gerenciar views"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>

      <SaveFilterViewDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        period={currentPeriod}
        customDateRange={currentCustomDateRange}
        billingType={currentBillingType}
        paymentMethod={currentPaymentMethod}
        sckCode={currentSckCode}
      />

      <ManageFilterViewsDialog
        open={manageDialogOpen}
        onOpenChange={setManageDialogOpen}
      />
    </>
  );
}
