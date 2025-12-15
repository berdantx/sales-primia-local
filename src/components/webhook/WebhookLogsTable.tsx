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
import { useIsMobile } from '@/hooks/use-mobile';
import type { WebhookLog } from '@/hooks/useWebhookLogs';

interface WebhookLogsTableProps {
  logs: WebhookLog[];
  isLoading: boolean;
  onViewDetails: (log: WebhookLog) => void;
}

function StatusBadge({ status, isMobile }: { status: string; isMobile?: boolean }) {
  const config = {
    processed: {
      label: isMobile ? 'OK' : 'Processado',
      icon: CheckCircle,
      className: 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20',
    },
    skipped: {
      label: isMobile ? 'Skip' : 'Ignorado',
      icon: AlertCircle,
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20',
    },
    error: {
      label: 'Erro',
      icon: XCircle,
      className: 'bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20',
    },
  };

  const statusConfig = config[status as keyof typeof config] || config.error;
  const Icon = statusConfig.icon;

  return (
    <Badge variant="outline" className={`${statusConfig.className} text-xs px-1.5 sm:px-2`}>
      <Icon className="h-3 w-3 mr-1" />
      {statusConfig.label}
    </Badge>
  );
}

export function WebhookLogsTable({ logs, isLoading, onViewDetails }: WebhookLogsTableProps) {
  const isMobile = useIsMobile();

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
    <div className="rounded-md border border-border/50 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs sm:text-sm">Data/Hora</TableHead>
            <TableHead className="text-xs sm:text-sm">Tipo</TableHead>
            <TableHead className="hidden sm:table-cell text-xs sm:text-sm">Código</TableHead>
            <TableHead className="text-xs sm:text-sm">Status</TableHead>
            <TableHead className="w-[50px] sm:w-[80px]">
              <span className="sr-only sm:not-sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="font-mono text-xs p-2 sm:p-4">
                <span className="hidden sm:inline">
                  {format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                </span>
                <span className="sm:hidden">
                  {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              </TableCell>
              <TableCell className="p-2 sm:p-4">
                <span className="font-medium text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none block">
                  {log.event_type}
                </span>
              </TableCell>
              <TableCell className="hidden sm:table-cell font-mono text-xs sm:text-sm p-2 sm:p-4">
                {log.transaction_code || '-'}
              </TableCell>
              <TableCell className="p-1 sm:p-4">
                <StatusBadge status={log.status} isMobile={isMobile} />
              </TableCell>
              <TableCell className="p-1 sm:p-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewDetails(log)}
                  title="Ver detalhes"
                  className="h-7 w-7 sm:h-8 sm:w-8"
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
