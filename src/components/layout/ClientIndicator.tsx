import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFilter } from '@/contexts/FilterContext';
import { useClients } from '@/hooks/useClients';
import { useUserRole } from '@/hooks/useUserRole';

export function ClientIndicator() {
  const { clientId } = useFilter();
  const { data: clients } = useClients();
  const { isMaster } = useUserRole();

  // Only show for master users
  if (!isMaster) return null;

  const selectedClient = clientId 
    ? clients?.find(c => c.id === clientId) 
    : null;

  const displayName = selectedClient?.name || 'Todos os clientes';

  return (
    <Badge 
      variant="outline" 
      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-normal"
    >
      <Building2 className="h-3 w-3" />
      <span className="max-w-[150px] truncate">{displayName}</span>
    </Badge>
  );
}
