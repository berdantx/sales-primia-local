import { LayoutDashboard, FileText, Target, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import defaultLogo from '@/assets/default-logo.png';

interface SidebarPreviewProps {
  appName: string;
  appSubtitle: string;
  logoUrl: string | null;
  logoUrlDark: string | null;
  primaryColor: string;
  previewTheme: 'light' | 'dark';
}

export function SidebarPreview({ 
  appName, 
  appSubtitle, 
  logoUrl, 
  logoUrlDark,
  primaryColor,
  previewTheme
}: SidebarPreviewProps) {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: FileText, label: 'Transações', active: false },
    { icon: Target, label: 'Metas', active: false },
    { icon: Settings, label: 'Configurações', active: false },
  ];

  // Convert HSL string to CSS hsl() format
  const primaryColorCss = `hsl(${primaryColor})`;

  // Determine which logo to show based on preview theme
  const currentLogo = previewTheme === 'dark'
    ? (logoUrlDark || logoUrl || defaultLogo)
    : (logoUrl || defaultLogo);

  const isDark = previewTheme === 'dark';

  return (
    <div 
      className={cn(
        "w-full max-w-[200px] rounded-lg border overflow-hidden shadow-lg transition-colors",
        isDark ? "bg-slate-900 border-slate-700" : "bg-sidebar border-sidebar-border"
      )}
    >
      {/* Header */}
      <div className={cn(
        "p-3 border-b",
        isDark ? "border-slate-700" : "border-sidebar-border"
      )}>
        <div className="flex flex-col items-center gap-1">
          <img 
            src={currentLogo} 
            alt="Logo" 
            className="h-10 w-auto object-contain max-w-full"
          />
        </div>
      </div>

      {/* Menu items */}
      <div className="p-2 space-y-1">
        <p className={cn(
          "text-[10px] px-2 py-1",
          isDark ? "text-slate-400" : "text-muted-foreground"
        )}>
          Visão Geral
        </p>
        {menuItems.map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors",
              item.active 
                ? "" 
                : isDark 
                  ? "text-slate-300 hover:bg-slate-800" 
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
      <div className={cn(
        "p-3 border-t mt-2",
        isDark ? "border-slate-700" : "border-sidebar-border"
      )}>
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center",
            isDark ? "bg-slate-700" : "bg-muted"
          )}>
            <User className={cn(
              "w-3 h-3",
              isDark ? "text-slate-400" : "text-muted-foreground"
            )} />
          </div>
          <span className={cn(
            "text-[10px] truncate",
            isDark ? "text-slate-400" : "text-muted-foreground"
          )}>
            usuario@email.com
          </span>
        </div>
      </div>
    </div>
  );
}
