import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SalesBreakdownCards } from './SalesBreakdownCards';
import { SalesBreakdownItem } from '@/hooks/useSalesBreakdown';
import { BarChart3 } from 'lucide-react';

interface SalesBreakdownDialogProps {
  data: SalesBreakdownItem[];
  isLoading?: boolean;
  onCategorySelect?: (category: string) => void;
}

export function SalesBreakdownDialog({ 
  data, 
  isLoading,
  onCategorySelect 
}: SalesBreakdownDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleCategoryClick = (category: string) => {
    if (category === selectedCategory || category === '') {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
      onCategorySelect?.(category);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Vendas por Tipo</span>
          <span className="sm:hidden">Por Tipo</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vendas por Tipo de Cobrança</DialogTitle>
          <DialogDescription>
            Clique em uma categoria para filtrar o dashboard
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <SalesBreakdownCards 
            data={data}
            isLoading={isLoading}
            onCategoryClick={handleCategoryClick}
            selectedCategory={selectedCategory}
            gridCols={3}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
