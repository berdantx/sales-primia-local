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
  MapPin
} from 'lucide-react';

interface AccessLogsTableProps {
  logs: AccessLog[] | undefined;
  isLoading: boolean;
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

export function AccessLogsTable({ logs, isLoading }: AccessLogsTableProps) {
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
  );
}
