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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pencil, Power, PowerOff, Users } from 'lucide-react';
import { Client } from '@/hooks/useClients';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientsTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onToggleStatus: (client: Client) => void;
  onManageUsers?: (client: Client) => void;
  isToggling?: boolean;
}

export function ClientsTable({ clients, onEdit, onToggleStatus, onManageUsers, isToggling }: ClientsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Slug</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Criado em</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={client.logo_url || undefined} alt={client.name} />
                  <AvatarFallback className="text-xs">
                    {client.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{client.name}</span>
              </div>
            </TableCell>
            <TableCell>
              <code className="text-xs bg-muted px-2 py-1 rounded">{client.slug}</code>
            </TableCell>
            <TableCell>
              <Badge variant={client.is_active ? 'default' : 'secondary'}>
                {client.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
            </TableCell>
            <TableCell>
              {client.created_at
                ? format(parseISO(client.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })
                : '-'}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                {onManageUsers && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onManageUsers(client)}
                    title="Gerenciar usuários"
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(client)}
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onToggleStatus(client)}
                  disabled={isToggling}
                  title={client.is_active ? 'Desativar' : 'Ativar'}
                >
                  {client.is_active ? (
                    <PowerOff className="h-4 w-4 text-destructive" />
                  ) : (
                    <Power className="h-4 w-4 text-green-500" />
                  )}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {clients.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
              Nenhum cliente encontrado
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}