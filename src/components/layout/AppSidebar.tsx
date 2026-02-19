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
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole, AppRole } from '@/hooks/useUserRole';
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
  Filter,
  Globe,
  Ban,
  SearchCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
      { title: 'Cancelamentos TMB', url: '/tmb-cancellations', icon: Ban, roles: ['master', 'admin', 'user'] },
      { title: 'Eduzz', url: '/eduzz-transactions', icon: CreditCard, roles: ['master', 'admin', 'user'] },
      { title: 'Cancelamentos Eduzz', url: '/eduzz-cancellations', icon: Ban, roles: ['master', 'admin', 'user'] },
    ]
  },
  {
    label: 'Dados',
    items: [
      { title: 'Leads', url: '/leads', icon: UserPlus, roles: ['master', 'admin', 'user'] },
      { title: 'Funil', url: '/leads/funnel', icon: Filter, roles: ['master', 'admin', 'user'] },
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
      { title: 'Duplicatas', url: '/duplicate-audit', icon: SearchCheck, roles: ['master', 'admin'] },
      { title: 'Configurações', url: '/settings', icon: Settings, roles: ['master', 'admin'] },
      { title: 'Landing Page', url: '/landing', icon: Globe, roles: ['master', 'admin'] },
    ]
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { role } = useUserRole();
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
      <SidebarContent className="pt-2">
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
                      {item.url === '/landing' ? (
                        <a
                          href="/landing"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3"
                          onClick={(e) => {
                            e.preventDefault();
                            window.open('/landing', '_blank');
                          }}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </a>
                      ) : (
                        <NavLink
                          to={item.url}
                          className="flex items-center gap-3"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      )}
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
