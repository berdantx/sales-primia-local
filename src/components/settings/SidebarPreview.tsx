import { LayoutDashboard, FileText, Target, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarPreviewProps {
  appName: string;
  appSubtitle: string;
  logoUrl: string | null;
  primaryColor: string;
}

export function SidebarPreview({ appName, appSubtitle, logoUrl, primaryColor }: SidebarPreviewProps) {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: FileText, label: 'Transações', active: false },
    { icon: Target, label: 'Metas', active: false },
    { icon: Settings, label: 'Configurações', active: false },
  ];

  // Convert HSL string to CSS hsl() format
  const primaryColorCss = `hsl(${primaryColor})`;

  return (
    <div className="w-full max-w-[200px] bg-sidebar rounded-lg border overflow-hidden shadow-lg">
      {/* Header */}
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: primaryColorCss }}
          >
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-full h-full object-cover"
              />
            ) : (
              <svg 
                className="w-4 h-4 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs truncate text-sidebar-foreground">
              {appName || 'Sales Analytics'}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {appSubtitle || 'Análise de Vendas'}
            </p>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="p-2 space-y-1">
        <p className="text-[10px] text-muted-foreground px-2 py-1">Visão Geral</p>
        {menuItems.map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors",
              item.active 
                ? "text-sidebar-accent-foreground" 
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
            style={item.active ? { 
              backgroundColor: `hsl(${primaryColor} / 0.1)`,
              color: primaryColorCss
            } : undefined}
          >
            <item.icon className="w-3.5 h-3.5" />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border mt-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
            <User className="w-3 h-3 text-muted-foreground" />
          </div>
          <span className="text-[10px] text-muted-foreground truncate">
            usuario@email.com
          </span>
        </div>
      </div>
    </div>
  );
}
