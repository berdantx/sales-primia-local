import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsersTable } from '@/components/users/UsersTable';
import { InvitationsTable } from '@/components/users/InvitationsTable';
import { InviteUserDialog } from '@/components/users/InviteUserDialog';
import { useUsers, useInvitations } from '@/hooks/useUsers';
import { Users as UsersIcon, Mail } from 'lucide-react';

export default function Users() {
  const { users, isLoading: usersLoading, updateRole, isUpdating } = useUsers();
  const { invitations, isLoading: invitationsLoading } = useInvitations();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie usuários e convites do sistema
            </p>
          </div>
          <InviteUserDialog />
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <UsersIcon className="h-4 w-4" />
              Usuários ({users?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="invitations" className="gap-2">
              <Mail className="h-4 w-4" />
              Convites ({invitations?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Usuários Cadastrados</CardTitle>
                <CardDescription>
                  Visualize e altere o nível de acesso dos usuários do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UsersTable
                  users={users}
                  isLoading={usersLoading}
                  onRoleChange={(userId, newRole) => updateRole({ userId, newRole })}
                  isUpdating={isUpdating}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations">
            <Card>
              <CardHeader>
                <CardTitle>Convites Enviados</CardTitle>
                <CardDescription>
                  Acompanhe o status dos convites enviados por email
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InvitationsTable
                  invitations={invitations}
                  isLoading={invitationsLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
