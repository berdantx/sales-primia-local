import { useLocation } from 'react-router-dom';
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
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Upload,
  FileText,
  Target,
  Settings,
  LogOut,
  LayoutDashboard,
  Wallet,
  GitCompare,
  Webhook,
} from 'lucide-react';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Comparativo', url: '/comparative', icon: GitCompare },
  { title: 'Upload', url: '/upload', icon: Upload },
  { title: 'Hotmart', url: '/transactions', icon: FileText },
  { title: 'TMB', url: '/tmb-transactions', icon: Wallet },
  { title: 'Webhook Logs', url: '/webhook-logs', icon: Webhook },
  { title: 'Metas', url: '/goals', icon: Target },
  { title: 'Configurações', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-lg">Sales Analytics</span>
              <span className="text-xs text-muted-foreground">Análise de Vendas</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex flex-col gap-3">
          {!collapsed && user && (
            <div className="text-sm">
              <p className="font-medium truncate">{user.email}</p>
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
