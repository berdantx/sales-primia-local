import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Copy, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { WebhookLog } from '@/hooks/useWebhookLogs';

interface LogDetailDialogProps {
  log: WebhookLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    processed: {
      label: 'Processado',
      icon: CheckCircle,
      className: 'bg-green-500/10 text-green-600 border-green-500/20',
    },
    skipped: {
      label: 'Ignorado',
      icon: AlertCircle,
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    },
    error: {
      label: 'Erro',
      icon: XCircle,
      className: 'bg-red-500/10 text-red-600 border-red-500/20',
    },
  };

  const statusConfig = config[status as keyof typeof config] || config.error;
  const Icon = statusConfig.icon;

  return (
    <Badge variant="outline" className={statusConfig.className}>
      <Icon className="h-3 w-3 mr-1" />
      {statusConfig.label}
    </Badge>
  );
}

export function LogDetailDialog({ log, open, onOpenChange }: LogDetailDialogProps) {
  const { toast } = useToast();

  if (!log) return null;

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(log.payload, null, 2));
    toast({
      title: 'Copiado!',
      description: 'Payload copiado para a área de transferência',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Detalhes do Log
            <StatusBadge status={log.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Data/Hora</p>
              <p className="font-medium">
                {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tipo de Evento</p>
              <p className="font-medium">{log.event_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Código da Transação</p>
              <p className="font-mono text-sm">{log.transaction_code || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ID do Log</p>
              <p className="font-mono text-xs text-muted-foreground">{log.id}</p>
            </div>
          </div>

          {log.error_message && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm font-medium text-red-600 mb-1">Mensagem de Erro</p>
              <p className="text-sm text-red-500">{log.error_message}</p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Payload JSON</p>
              <Button variant="outline" size="sm" onClick={handleCopyPayload}>
                <Copy className="h-3 w-3 mr-1" />
                Copiar
              </Button>
            </div>
            <ScrollArea className="h-[300px] rounded-md border bg-muted/30 p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
