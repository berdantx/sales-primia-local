import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { useTheme } from 'next-themes';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole, AppRole } from '@/hooks/useUserRole';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { Button } from '@/components/ui/button';
import {
  Upload,
  FileText,
  Target,
  Settings,
  LogOut,
  LayoutDashboard,
  Wallet,
  CreditCard,
  GitCompare,
  Webhook,
  Users,
  Send,
  Building2,
  UserPlus,
  BookOpen,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import defaultLogo from '@/assets/default-logo.png';

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: 'Visão Geral',
    items: [
      { title: 'Dashboard', url: '/', icon: LayoutDashboard, roles: ['master', 'admin', 'user'] },
      { title: 'Comparativo', url: '/comparative', icon: GitCompare, roles: ['master', 'admin'] },
    ]
  },
  {
    label: 'Vendas',
    items: [
      { title: 'Hotmart', url: '/transactions', icon: FileText, roles: ['master', 'admin', 'user'] },
      { title: 'TMB', url: '/tmb-transactions', icon: Wallet, roles: ['master', 'admin', 'user'] },
      { title: 'Eduzz', url: '/eduzz-transactions', icon: CreditCard, roles: ['master', 'admin', 'user'] },
    ]
  },
  {
    label: 'Dados',
    items: [
      { title: 'Leads', url: '/leads', icon: UserPlus, roles: ['master', 'admin', 'user'] },
      { title: 'Metas', url: '/goals', icon: Target, roles: ['master', 'admin', 'user'] },
      { title: 'Upload', url: '/upload', icon: Upload, roles: ['master', 'admin'] },
    ]
  },
  {
    label: 'Integrações',
    items: [
      { title: 'Webhook Logs', url: '/webhook-logs', icon: Webhook, roles: ['master', 'admin'] },
      { title: 'Webhooks Externos', url: '/webhook-config', icon: Send, roles: ['master', 'admin'] },
      { title: 'Docs Webhook', url: '/webhook-docs', icon: BookOpen, roles: ['master', 'admin'] },
    ]
  },
  {
    label: 'Sistema',
    items: [
      { title: 'Clientes', url: '/clients', icon: Building2, roles: ['master'] },
      { title: 'Usuários', url: '/users', icon: Users, roles: ['master'] },
      { title: 'Configurações', url: '/settings', icon: Settings, roles: ['master', 'admin'] },
    ]
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { role } = useUserRole();
  const { settings: branding } = useBrandingSettings();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { resolvedTheme } = useTheme();

  // Determine which logo to use based on current theme
  const currentLogo = useMemo(() => {
    const isDark = resolvedTheme === 'dark';
    
    // If dark mode and we have a dark logo, use it
    if (isDark && branding.logoUrlDark) {
      return branding.logoUrlDark;
    }
    
    // If light mode and we have a light logo, use it
    if (!isDark && branding.logoUrl) {
      return branding.logoUrl;
    }
    
    // Fallback: use whichever logo is available, or default
    return branding.logoUrl || branding.logoUrlDark || defaultLogo;
  }, [branding.logoUrl, branding.logoUrlDark, resolvedTheme]);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex flex-col items-center gap-2">
          <img 
            src={currentLogo} 
            alt="Logo" 
            className={collapsed ? "h-8 w-8 object-contain" : "h-12 w-auto object-contain max-w-full"}
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {menuGroups.map((group) => {
          const visibleItems = group.items.filter(item => item.roles.includes(role));
          
          if (visibleItems.length === 0) return null;
          
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.url)}
                        tooltip={item.title}
                      >
                        <NavLink
                          to={item.url}
                          className="flex items-center gap-3"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex flex-col gap-3">
          {!collapsed && user && (
            <div className="space-y-2">
              <Badge 
                className={
                  role === 'master' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0' 
                    : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                }
              >
                {role === 'master' ? '👑 Master' : '👤 Cliente'}
              </Badge>
              <p className="font-medium truncate text-sm">{user.email}</p>
            </div>
          )}
          {collapsed && (
            <div className="flex justify-center">
              <Badge 
                className={
                  role === 'master' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 px-1' 
                    : 'bg-blue-500/10 text-blue-500 border-blue-500/20 px-1'
                }
              >
                {role === 'master' ? '👑' : '👤'}
              </Badge>
            </div>
          )}
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            onClick={signOut}
            className="justify-start gap-2"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sair</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
