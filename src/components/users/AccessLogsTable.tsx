import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AccessLog } from '@/hooks/useAccessLogs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckCircle, 
  XCircle, 
  LogOut, 
  Key, 
  Ban,
  Monitor,
  MapPin,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AccessLogsTableProps {
  logs: AccessLog[] | undefined;
  isLoading: boolean;
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const eventConfig: Record<string, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  login_success: { label: 'Login', icon: <CheckCircle className="h-3 w-3" />, variant: 'default' },
  login_failed: { label: 'Login falhou', icon: <XCircle className="h-3 w-3" />, variant: 'destructive' },
  logout: { label: 'Logout', icon: <LogOut className="h-3 w-3" />, variant: 'secondary' },
  password_changed: { label: 'Senha alterada', icon: <Key className="h-3 w-3" />, variant: 'outline' },
  session_revoked: { label: 'Sessão revogada', icon: <Ban className="h-3 w-3" />, variant: 'destructive' },
};

function parseUserAgent(ua: string | null): string {
  if (!ua) return 'Desconhecido';
  
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Opera')) return 'Opera';
  
  return 'Outro';
}

export function AccessLogsTable({ 
  logs, 
  isLoading, 
  totalCount, 
  page, 
  pageSize, 
  onPageChange 
}: AccessLogsTableProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  const startRecord = page * pageSize + 1;
  const endRecord = Math.min((page + 1) * pageSize, totalCount);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum log de acesso encontrado
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Navegador</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const event = eventConfig[log.event_type] || { 
                label: log.event_type, 
                icon: null, 
                variant: 'secondary' as const 
              };
              
              return (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{log.email}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={event.variant} className="gap-1">
                      {event.icon}
                      {event.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.ip_address || '-'}
                  </TableCell>
                  <TableCell>
                    {log.city || log.country ? (
                      <span className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {[log.city, log.country].filter(Boolean).join(', ')}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm">
                      <Monitor className="h-3 w-3 text-muted-foreground" />
                      {parseUserAgent(log.user_agent)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Mostrando {startRecord}-{endRecord} de {totalCount} registros
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i;
                } else if (page < 3) {
                  pageNum = i;
                } else if (page > totalPages - 4) {
                  pageNum = totalPages - 5 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => onPageChange(pageNum)}
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}
              
              {totalPages > 5 && page < totalPages - 3 && (
                <>
                  <span className="px-1 text-muted-foreground">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => onPageChange(totalPages - 1)}
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
