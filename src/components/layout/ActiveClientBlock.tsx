import { Building2 } from 'lucide-react';
import { useFilter } from '@/contexts/FilterContext';
import { useClients } from '@/hooks/useClients';

export function ActiveClientBlock() {
  const { clientId } = useFilter();
  const { data: clients } = useClients();

  const selectedClient = clientId ? clients?.find(c => c.id === clientId) : null;
  const displayName = selectedClient?.name || 'Todos os clientes';
  const logoUrl = selectedClient?.logo_url;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/40 border border-border/50 w-fit">
      {logoUrl ? (
        <img 
          src={logoUrl} 
          alt={displayName} 
          className="h-7 w-7 rounded-full object-cover border border-border/40"
        />
      ) : (
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Building2 className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
        </div>
      )}
      <div className="leading-tight">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground block">
          Cliente Ativo
        </span>
        <span className="text-sm font-bold text-foreground">
          {displayName}
        </span>
      </div>
    </div>
  );
}
