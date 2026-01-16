import { LayoutDashboard, FileText, Target, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import defaultLogo from '@/assets/default-logo.png';

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
        <div className="flex flex-col items-center gap-1">
          <img 
            src={logoUrl || defaultLogo} 
            alt="Logo" 
            className="h-10 w-auto object-contain max-w-full"
          />
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
