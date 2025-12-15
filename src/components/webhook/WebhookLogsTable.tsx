import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { WebhookLog } from '@/hooks/useWebhookLogs';

interface WebhookLogsTableProps {
  logs: WebhookLog[];
  isLoading: boolean;
  onViewDetails: (log: WebhookLog) => void;
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    processed: {
      label: 'Processado',
      variant: 'default' as const,
      icon: CheckCircle,
      className: 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20',
    },
    skipped: {
      label: 'Ignorado',
      variant: 'secondary' as const,
      icon: AlertCircle,
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20',
    },
    error: {
      label: 'Erro',
      variant: 'destructive' as const,
      icon: XCircle,
      className: 'bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20',
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

export function WebhookLogsTable({ logs, isLoading, onViewDetails }: WebhookLogsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhum log encontrado</p>
        <p className="text-sm mt-1">Os logs aparecerão aqui quando o webhook receber eventos</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border/50">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data/Hora</TableHead>
            <TableHead>Tipo de Evento</TableHead>
            <TableHead>Código da Transação</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[80px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="font-mono text-sm">
                {format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
              </TableCell>
              <TableCell>
                <span className="font-medium">{log.event_type}</span>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {log.transaction_code || '-'}
              </TableCell>
              <TableCell>
                <StatusBadge status={log.status} />
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewDetails(log)}
                  title="Ver detalhes"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
