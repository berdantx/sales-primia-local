import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Bell, History, Target, Upload } from 'lucide-react';
import { HeaderFilters } from './HeaderFilters';
import { ClientIndicator } from './ClientIndicator';

export function Header() {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 sm:h-16 items-center gap-2 sm:gap-4 px-3 sm:px-4 md:px-6">
        <SidebarTrigger className="-ml-1 sm:-ml-2" />
        
        {/* Action buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/transactions')}
            className="h-8 px-2 sm:px-3"
          >
            <History className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Histórico</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/goals')}
            className="h-8 px-2 sm:px-3"
          >
            <Target className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Metas</span>
          </Button>
          <Button 
            size="sm" 
            onClick={() => navigate('/upload')}
            className="h-8 px-2 sm:px-3"
          >
            <Upload className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Importar</span>
          </Button>
        </div>

        <div className="flex-1" />

        {/* Client Indicator */}
        <ClientIndicator />

        {/* Advanced Filters */}
        <HeaderFilters />

        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-10 sm:w-10">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
