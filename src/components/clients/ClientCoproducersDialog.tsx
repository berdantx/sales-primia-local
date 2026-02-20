import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Client } from '@/hooks/useClients';
import {
  useCoproducers,
  useAddCoproducer,
  useToggleCoproducer,
  useRemoveCoproducer,
  useSetProductRate,
  useRemoveProductRate,
  useClientProducts,
  Coproducer,
} from '@/hooks/useCoproducers';
import { useUsers } from '@/hooks/useUsers';
import { Plus, Trash2, Loader2, Handshake, Package } from 'lucide-react';

interface ClientCoproducersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

export function ClientCoproducersDialog({ open, onOpenChange, client }: ClientCoproducersDialogProps) {
  const { data: coproducers, isLoading } = useCoproducers(client?.id || null);
  const { data: products } = useClientProducts(client?.id || null);
  const { users } = useUsers();
  const addCoproducer = useAddCoproducer();
  const toggleCoproducer = useToggleCoproducer();
  const removeCoproducer = useRemoveCoproducer();
  const setProductRate = useSetProductRate();
  const removeProductRate = useRemoveProductRate();

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [confirmRemove, setConfirmRemove] = useState<Coproducer | null>(null);

  if (!client) return null;

  const existingUserIds = new Set(coproducers?.map(c => c.user_id) || []);
  const availableUsers = users?.filter(u => !existingUserIds.has(u.id)) || [];

  const handleAddCoproducer = () => {
    if (!selectedUserId) return;
    addCoproducer.mutate({ clientId: client.id, userId: selectedUserId }, {
      onSuccess: () => setSelectedUserId(''),
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5" />
              Coprodutores de {client.name}
            </DialogTitle>
            <DialogDescription>
              Gerencie os coprodutores e suas porcentagens por produto.
            </DialogDescription>
          </DialogHeader>

          {/* Add coproducer */}
          <div className="flex gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecionar usuário..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.email || u.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddCoproducer}
              disabled={!selectedUserId || addCoproducer.isPending}
              size="sm"
            >
              {addCoproducer.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Adicionar
            </Button>
          </div>

          <Separator />

          {/* Coproducers list */}
          <ScrollArea className="max-h-[50vh]">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !coproducers?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum coprodutor cadastrado
              </div>
            ) : (
              <div className="space-y-4">
                {coproducers.map(cop => (
                  <CoproducerItem
                    key={cop.id}
                    coproducer={cop}
                    clientId={client.id}
                    products={products || []}
                    onToggle={(isActive) =>
                      toggleCoproducer.mutate({ id: cop.id, isActive, clientId: client.id })
                    }
                    onRemove={() => setConfirmRemove(cop)}
                    onSetRate={(productName, rate) =>
                      setProductRate.mutate({
                        coproducerId: cop.id,
                        productName,
                        ratePercent: rate,
                        clientId: client.id,
                      })
                    }
                    onRemoveRate={(rateId) =>
                      removeProductRate.mutate({ id: rateId, clientId: client.id })
                    }
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Confirm removal dialog */}
      <AlertDialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover coprodutor?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá {confirmRemove?.user_name || 'este usuário'} e todas as taxas de produto associadas.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmRemove) {
                  removeCoproducer.mutate({ id: confirmRemove.id, clientId: client.id });
                  setConfirmRemove(null);
                }
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Sub-component for each coproducer
function CoproducerItem({
  coproducer,
  clientId,
  products,
  onToggle,
  onRemove,
  onSetRate,
  onRemoveRate,
}: {
  coproducer: Coproducer;
  clientId: string;
  products: string[];
  onToggle: (isActive: boolean) => void;
  onRemove: () => void;
  onSetRate: (productName: string, rate: number) => void;
  onRemoveRate: (rateId: string) => void;
}) {
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState('');
  const [newRate, setNewRate] = useState('');

  const assignedProducts = new Set(coproducer.rates.map(r => r.product_name));
  const availableProducts = products.filter(p => !assignedProducts.has(p));

  const handleAddRate = () => {
    const rate = parseFloat(newRate);
    if (!newProduct || isNaN(rate) || rate <= 0 || rate > 100) return;
    onSetRate(newProduct, rate);
    setNewProduct('');
    setNewRate('');
    setAddingProduct(false);
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {coproducer.user_name || coproducer.user_id.slice(0, 8)}
          </span>
          <Badge variant={coproducer.is_active ? 'default' : 'secondary'}>
            {coproducer.is_active ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={coproducer.is_active}
            onCheckedChange={onToggle}
          />
          <Button variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8 text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Product rates */}
      {coproducer.rates.length > 0 && (
        <div className="space-y-2 pl-2">
          {coproducer.rates.map(rate => (
            <ProductRateRow
              key={rate.id}
              rate={rate}
              onUpdate={(newRate) => onSetRate(rate.product_name, newRate)}
              onRemove={() => onRemoveRate(rate.id)}
            />
          ))}
        </div>
      )}

      {/* Add product */}
      {addingProduct ? (
        <div className="flex gap-2 items-end pl-2">
          <div className="flex-1">
            {availableProducts.length > 0 ? (
              <Select value={newProduct} onValueChange={setNewProduct}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Produto..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map(p => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Nome do produto"
                value={newProduct}
                onChange={e => setNewProduct(e.target.value)}
                className="h-8 text-sm"
              />
            )}
          </div>
          <Input
            type="number"
            placeholder="%"
            value={newRate}
            onChange={e => setNewRate(e.target.value)}
            className="w-20 h-8 text-sm"
            min={0.01}
            max={100}
            step={0.01}
          />
          <Button size="sm" variant="outline" className="h-8" onClick={handleAddRate}>
            Salvar
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setAddingProduct(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs pl-2"
          onClick={() => setAddingProduct(true)}
        >
          <Package className="h-3 w-3 mr-1" />
          Adicionar produto
        </Button>
      )}
    </div>
  );
}

// Sub-component for each product rate row
function ProductRateRow({
  rate,
  onUpdate,
  onRemove,
}: {
  rate: { id: string; product_name: string; rate_percent: number };
  onUpdate: (newRate: number) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(rate.rate_percent));

  const handleSave = () => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      onUpdate(parsed);
      setEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <Package className="h-3 w-3 text-muted-foreground" />
      <span className="flex-1 truncate">{rate.product_name}</span>
      {editing ? (
        <>
          <Input
            type="number"
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-20 h-7 text-sm"
            min={0.01}
            max={100}
            step={0.01}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
          <span className="text-muted-foreground">%</span>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleSave}>
            OK
          </Button>
        </>
      ) : (
        <>
          <button
            className="font-mono text-primary hover:underline cursor-pointer"
            onClick={() => setEditing(true)}
          >
            {rate.rate_percent}%
          </button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </Button>
        </>
      )}
    </div>
  );
}
