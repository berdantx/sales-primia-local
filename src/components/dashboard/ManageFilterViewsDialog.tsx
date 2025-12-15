import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  Trash2, 
  Pencil, 
  Check, 
  X, 
  Settings,
  Calendar,
  Filter 
} from 'lucide-react';
import { 
  FilterView, 
  useFilterViews, 
  useUpdateFilterView, 
  useDeleteFilterView 
} from '@/hooks/useFilterViews';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ManageFilterViewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const periodLabels: Record<string, string> = {
  '7d': '7 dias',
  '30d': '30 dias',
  '90d': '90 dias',
  '365d': '1 ano',
  'all': 'Tudo',
  'custom': 'Personalizado',
};

export function ManageFilterViewsDialog({
  open,
  onOpenChange,
}: ManageFilterViewsDialogProps) {
  const { data: views = [] } = useFilterViews();
  const { mutate: updateView } = useUpdateFilterView();
  const { mutate: deleteView } = useDeleteFilterView();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const startEdit = (view: FilterView) => {
    setEditingId(view.id);
    setEditName(view.name);
  };

  const saveEdit = (id: string) => {
    if (editName.trim()) {
      updateView({ id, name: editName.trim() });
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const toggleFavorite = (view: FilterView) => {
    updateView({ id: view.id, is_favorite: !view.is_favorite });
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteView(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Gerenciar Views
            </DialogTitle>
            <DialogDescription>
              Edite, favorite ou exclua suas views salvas
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px] pr-4">
            {views.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhuma view salva ainda
              </div>
            ) : (
              <div className="space-y-3">
                {views.map((view) => (
                  <div
                    key={view.id}
                    className="p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {editingId === view.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(view.id);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                          />
                          <Button size="icon" variant="ghost" onClick={() => saveEdit(view.id)}>
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={cancelEdit}>
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {view.is_favorite && (
                                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                              )}
                              <span className="font-medium">{view.name}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                {periodLabels[view.period] || view.period}
                              </Badge>
                              {view.billing_type && (
                                <Badge variant="secondary" className="text-xs">
                                  <Filter className="h-3 w-3 mr-1" />
                                  {view.billing_type}
                                </Badge>
                              )}
                              {view.payment_method && (
                                <Badge variant="secondary" className="text-xs">
                                  {view.payment_method}
                                </Badge>
                              )}
                              {view.sck_code && (
                                <Badge variant="secondary" className="text-xs">
                                  [{view.sck_code}]
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => toggleFavorite(view)}
                              title={view.is_favorite ? 'Remover favorito' : 'Favoritar'}
                            >
                              <Star 
                                className={`h-4 w-4 ${
                                  view.is_favorite 
                                    ? 'fill-amber-500 text-amber-500' 
                                    : 'text-muted-foreground'
                                }`} 
                              />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => startEdit(view)}
                              title="Renomear"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteConfirmId(view.id)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir view?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A view será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
