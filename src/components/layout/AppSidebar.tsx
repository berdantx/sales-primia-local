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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole, AppRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  GitCompare,
  FileText,
  Wallet,
  CreditCard,
  Globe,
  Ban,
  UserPlus,
  Filter,
  Handshake,
  Target,
  Upload,
  Settings,
  LogOut,
  ChevronDown,
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
  collapsible: boolean;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: 'Principal',
    collapsible: false,
    items: [
      { title: 'Painel', url: '/', icon: LayoutDashboard, roles: ['master', 'admin', 'user'] },
      { title: 'Comparativo', url: '/comparative', icon: GitCompare, roles: ['master', 'admin'] },
    ],
  },
  {
    label: 'Vendas',
    collapsible: true,
    items: [
      { title: 'Hotmart', url: '/transactions', icon: FileText, roles: ['master', 'admin', 'user'] },
      { title: 'TMB', url: '/tmb-transactions', icon: Wallet, roles: ['master', 'admin', 'user'] },
      { title: 'Cancelamentos TMB', url: '/tmb-cancellations', icon: Ban, roles: ['master', 'admin', 'user'] },
      { title: 'Eduzz', url: '/eduzz-transactions', icon: CreditCard, roles: ['master', 'admin', 'user'] },
      { title: 'Cancelamentos Eduzz', url: '/eduzz-cancellations', icon: Ban, roles: ['master', 'admin', 'user'] },
      { title: 'Internacional', url: '/international-sales', icon: Globe, roles: ['master', 'admin', 'user'] },
    ],
  },
  {
    label: 'Análise',
    collapsible: true,
    items: [
      { title: 'Leads', url: '/leads', icon: UserPlus, roles: ['master', 'admin', 'user'] },
      { title: 'Funil', url: '/leads/funnel', icon: Filter, roles: ['master', 'admin', 'user'] },
      { title: 'Coprodução', url: '/coproduction', icon: Handshake, roles: ['master', 'admin', 'user'] },
      { title: 'Metas', url: '/goals', icon: Target, roles: ['master', 'admin', 'user'] },
    ],
  },
  {
    label: 'Dados',
    collapsible: false,
    items: [
      { title: 'Importar', url: '/upload', icon: Upload, roles: ['master', 'admin'] },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { role } = useUserRole();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const groupHasActiveItem = (items: MenuItem[]) =>
    items.some(item => isActive(item.url));

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-2">
        {menuGroups.map((group) => {
          const visibleItems = group.items.filter(item => item.roles.includes(role));
          if (visibleItems.length === 0) return null;

          if (group.collapsible) {
            const isGroupActive = groupHasActiveItem(visibleItems);

            return (
              <Collapsible key={group.label} defaultOpen={isGroupActive} className="group/collapsible">
                <SidebarGroup>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/50 rounded-md transition-colors">
                      {group.label}
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
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
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            );
          }

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
          {/* Settings link */}
          {(role === 'master' || role === 'admin') && (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/settings')}
                  tooltip="Configurações"
                >
                  <NavLink
                    to="/settings"
                    className="flex items-center gap-3"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                  >
                    <Settings className="h-4 w-4" />
                    {!collapsed && <span>Configurações</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          )}

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
