import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { RoleSelector } from './RoleSelector';
import { AppRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  created_at: string;
}

interface UsersTableProps {
  users: User[] | undefined;
  isLoading: boolean;
  onRoleChange: (userId: string, newRole: AppRole) => void;
  isUpdating: boolean;
}

export function UsersTable({ users, isLoading, onRoleChange, isUpdating }: UsersTableProps) {
  const { user: currentUser } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum usuário encontrado
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Nível de Acesso</TableHead>
          <TableHead>Data de Cadastro</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>
              <div>
                <p className="font-medium">{user.full_name || 'Sem nome'}</p>
                <p className="text-sm text-muted-foreground">{user.id}</p>
              </div>
            </TableCell>
            <TableCell>
              <RoleSelector
                currentRole={user.role}
                onRoleChange={(newRole) => onRoleChange(user.id, newRole)}
                disabled={isUpdating}
                isCurrentUser={user.id === currentUser?.id}
              />
            </TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(user.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
