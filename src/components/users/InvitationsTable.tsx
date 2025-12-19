import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, CheckCircle, XCircle, Building2 } from 'lucide-react';

interface Invitation {
  id: string;
  email: string;
  status: string;
  role: string;
  created_at: string;
  expires_at: string;
  client_id: string | null;
  clients: { name: string } | null;
}

interface InvitationsTableProps {
  invitations: Invitation[] | undefined;
  isLoading: boolean;
}

export function InvitationsTable({ invitations, isLoading }: InvitationsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!invitations || invitations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum convite enviado
      </div>
    );
  }

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    
    if (status === 'accepted') {
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Aceito
        </Badge>
      );
    }
    
    if (isExpired || status === 'expired') {
      return (
        <Badge variant="secondary" className="bg-red-500/10 text-red-500 border-red-500/20">
          <XCircle className="h-3 w-3 mr-1" />
          Expirado
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
        <Clock className="h-3 w-3 mr-1" />
        Pendente
      </Badge>
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Enviado em</TableHead>
          <TableHead>Expira em</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.map((invitation) => (
          <TableRow key={invitation.id}>
            <TableCell className="font-medium">{invitation.email}</TableCell>
            <TableCell>
              {invitation.clients?.name ? (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  {invitation.clients.name}
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell>
              {getStatusBadge(invitation.status, invitation.expires_at)}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(invitation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(invitation.expires_at), "dd/MM/yyyy", { locale: ptBR })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
