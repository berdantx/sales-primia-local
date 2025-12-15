import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Save, Star, Calendar, Filter } from 'lucide-react';
import { useSaveFilterView } from '@/hooks/useFilterViews';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SaveFilterViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: string;
  customDateRange?: DateRange;
  billingType: string | null;
  paymentMethod: string | null;
  sckCode: string | null;
}

const periodLabels: Record<string, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  '365d': 'Último ano',
  'all': 'Tudo',
  'custom': 'Personalizado',
};

export function SaveFilterViewDialog({
  open,
  onOpenChange,
  period,
  customDateRange,
  billingType,
  paymentMethod,
  sckCode,
}: SaveFilterViewDialogProps) {
  const [name, setName] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const { mutate: saveView, isPending } = useSaveFilterView();

  const handleSave = () => {
    if (!name.trim()) return;

    saveView({
      name: name.trim(),
      period,
      custom_date_start: period === 'custom' ? customDateRange?.from : null,
      custom_date_end: period === 'custom' ? customDateRange?.to : null,
      billing_type: billingType,
      payment_method: paymentMethod,
      sck_code: sckCode,
      is_favorite: isFavorite,
    }, {
      onSuccess: () => {
        setName('');
        setIsFavorite(false);
        onOpenChange(false);
      },
    });
  };

  const formatCustomRange = () => {
    if (!customDateRange?.from || !customDateRange?.to) return '';
    return `${format(customDateRange.from, 'dd/MM/yy', { locale: ptBR })} - ${format(customDateRange.to, 'dd/MM/yy', { locale: ptBR })}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Salvar View de Filtros
          </DialogTitle>
          <DialogDescription>
            Salve a combinação atual de filtros para acesso rápido
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da View</Label>
            <Input
              id="name"
              placeholder="Ex: Campanhas de Ads, PIX + Recuperador..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Filtros que serão salvos:</Label>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {period === 'custom' ? formatCustomRange() : periodLabels[period]}
              </Badge>
              {billingType && (
                <Badge variant="secondary">
                  <Filter className="h-3 w-3 mr-1" />
                  {billingType}
                </Badge>
              )}
              {paymentMethod && (
                <Badge variant="secondary">
                  {paymentMethod}
                </Badge>
              )}
              {sckCode && (
                <Badge variant="secondary">
                  [{sckCode}]
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="favorite"
              checked={isFavorite}
              onCheckedChange={(checked) => setIsFavorite(checked as boolean)}
            />
            <Label htmlFor="favorite" className="flex items-center gap-1 cursor-pointer">
              <Star className="h-4 w-4 text-amber-500" />
              Marcar como favorita
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isPending}>
            <Save className="h-4 w-4 mr-2" />
            {isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
