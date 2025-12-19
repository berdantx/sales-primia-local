import { Building2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClients } from '@/hooks/useClients';
import { useUserRole } from '@/hooks/useUserRole';
import { Skeleton } from '@/components/ui/skeleton';

interface ClientSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function ClientSelector({ value, onChange }: ClientSelectorProps) {
  const { data: clients, isLoading } = useClients();
  const { isMaster } = useUserRole();

  // Only show for master users with multiple clients
  if (!isMaster || !clients || clients.length <= 1) {
    return null;
  }

  if (isLoading) {
    return <Skeleton className="h-8 w-[160px]" />;
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground hidden sm:block" />
      <Select 
        value={value || 'all'} 
        onValueChange={(v) => onChange(v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs sm:text-sm bg-background">
          <SelectValue placeholder="Selecionar cliente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os clientes</SelectItem>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
