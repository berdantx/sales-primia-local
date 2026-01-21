import { Building2, ChevronDown, Users } from 'lucide-react';
import { useFilter } from '@/contexts/FilterContext';
import { useClients } from '@/hooks/useClients';
import { useUserRole } from '@/hooks/useUserRole';
import { useClientLeadCounts } from '@/hooks/useClientLeadCounts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
      {/* Main row: Title + Logo on left, Button on right */}
      <div className="flex items-center justify-between gap-4">
        {/* Left side: Title + Client Logo */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {title}
          </h1>
          
          {/* Client logo */}
          {selectedClient?.logo_url && (
            <Avatar className="h-8 w-8 border border-border">
              <AvatarImage 
                src={selectedClient.logo_url} 
                alt={selectedClient.name} 
              />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {selectedClient.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Right side: Change client button */}
        {showClientSelector && clients && clients.length > 0 && !isLoadingClients && !isLoadingRole && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs gap-1.5 shrink-0 border-primary/50 bg-primary/5 hover:bg-primary/10 text-primary font-medium"
              >
                <Building2 className="h-3.5 w-3.5" />
                Alterar cliente
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover">
              {/* Only masters can see "All clients" option */}
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
        )}
      </div>

      {/* Show badge for masters OR non-master users with multiple clients */}
      {showClientSelector && (
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className="px-3 py-1.5 text-sm font-medium border-primary/50 bg-primary/10 text-primary"
          >
            <Building2 className="h-3.5 w-3.5 mr-1.5" />
            {displayName}
          </Badge>
        </div>
      )}

      {description && (
        <p className="text-muted-foreground text-xs sm:text-sm">
          {description}
        </p>
      )}
    </div>
  );
}
