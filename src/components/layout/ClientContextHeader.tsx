import { Building2, ChevronDown } from 'lucide-react';
import { useFilter } from '@/contexts/FilterContext';
import { useClients } from '@/hooks/useClients';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ClientContextHeaderProps {
  title: string;
  description?: string;
}

export function ClientContextHeader({ title, description }: ClientContextHeaderProps) {
  const { clientId, setClientId } = useFilter();
  const { data: clients } = useClients();
  const { isMaster } = useUserRole();

  const selectedClient = clients?.find(c => c.id === clientId);
  const displayName = selectedClient?.name || 'Todos os clientes';

  return (
    <div className="space-y-1">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {title}
          {isMaster && (
            <span className="text-muted-foreground font-normal text-lg sm:text-xl">
              {' '}- {displayName}
            </span>
          )}
        </h1>

        {isMaster && clients && clients.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 shrink-0">
                <Building2 className="h-3 w-3" />
                Alterar cliente
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-popover">
              <DropdownMenuItem 
                onClick={() => setClientId(null)}
                className={!clientId ? 'bg-accent' : ''}
              >
                Todos os clientes
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {clients.map(client => (
                <DropdownMenuItem 
                  key={client.id} 
                  onClick={() => setClientId(client.id)}
                  className={clientId === client.id ? 'bg-accent' : ''}
                >
                  {client.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {description && (
        <p className="text-muted-foreground text-xs sm:text-sm">
          {description}
        </p>
      )}
    </div>
  );
}
