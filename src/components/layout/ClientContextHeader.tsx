import { ChevronDown, Users } from 'lucide-react';
import { useFilter } from '@/contexts/FilterContext';
import { useClients } from '@/hooks/useClients';
import { useUserRole } from '@/hooks/useUserRole';
import { useClientLeadCounts } from '@/hooks/useClientLeadCounts';
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
  const { data: clients, isLoading: isLoadingClients } = useClients();
  const { isMaster, isLoading: isLoadingRole } = useUserRole();
  const { data: leadCounts } = useClientLeadCounts();

  const selectedClient = clients?.find(c => c.id === clientId);
  const displayName = selectedClient?.name || 'Todos os clientes';
  
  // Show client selector for master users OR non-master users with multiple clients
  const hasMultipleClients = clients && clients.length > 1;
  const showClientSelector = isMaster || hasMultipleClients;

  return (
    <div className="space-y-2">
      {/* Title + Client selector inline */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
          {title}
        </h1>

        {showClientSelector && clients && clients.length > 0 && !isLoadingClients && !isLoadingRole && (
          <>
            <span className="text-muted-foreground text-lg sm:text-xl">•</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-auto p-0 text-muted-foreground hover:text-foreground hover:bg-transparent font-medium gap-1 text-base sm:text-lg"
                >
                  {displayName}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-popover">
                {isMaster && (
                  <>
                    <DropdownMenuItem 
                      onClick={() => setClientId(null)}
                      className={!clientId ? 'bg-accent' : ''}
                    >
                      Todos os clientes
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {clients.map(client => {
                  const leadCount = leadCounts?.[client.id] || 0;
                  return (
                    <DropdownMenuItem 
                      key={client.id} 
                      onClick={() => setClientId(client.id)}
                      className={`flex items-center justify-between ${clientId === client.id ? 'bg-accent' : ''}`}
                    >
                      <span>{client.name}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                        <Users className="h-3 w-3" />
                        {leadCount}
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
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
