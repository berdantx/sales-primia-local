import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Users, Check } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false);
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
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-auto p-0 text-primary hover:text-primary/80 hover:bg-transparent font-medium gap-1 text-base sm:text-lg"
                >
                  {displayName}
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </motion.span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="start" 
                className="w-56 bg-popover"
                asChild
              >
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  {isMaster && (
                    <>
                      <DropdownMenuItem 
                        onClick={() => setClientId(null)}
                        className={`flex items-center justify-between transition-all duration-150 hover:bg-primary/10 hover:text-primary hover:pl-4 ${!clientId ? 'bg-primary/5 text-primary font-medium' : ''}`}
                      >
                        <span>Todos os clientes</span>
                        {!clientId && <Check className="h-4 w-4 text-primary" />}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {clients.map((client, index) => {
                    const leadCount = leadCounts?.[client.id] || 0;
                    const isSelected = clientId === client.id;
                    return (
                      <motion.div
                        key={client.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.15 }}
                      >
                        <DropdownMenuItem 
                          onClick={() => setClientId(client.id)}
                          className={`flex items-center justify-between transition-all duration-150 hover:bg-primary/10 hover:text-primary hover:pl-4 ${isSelected ? 'bg-primary/5 text-primary font-medium' : ''}`}
                        >
                          <span className="flex items-center gap-2">
                            {client.name}
                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                            <Users className="h-3 w-3" />
                            {leadCount}
                          </span>
                        </DropdownMenuItem>
                      </motion.div>
                    );
                  })}
                </motion.div>
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
