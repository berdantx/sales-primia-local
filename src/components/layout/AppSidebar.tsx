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
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole, AppRole } from '@/hooks/useUserRole';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Target,
  Wallet,
  FileUp,
  Ban,
  Activity,
  Users,
  Database,
  Link2,
  ShieldCheck,
  Settings,
  User,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import defaultLogo from '@/assets/default-logo.png';
import { useMemo } from 'react';

// Map our AppRole to navigation roles
// master → produtor/admin, admin → admin, user → coprodutor
type NavRole = AppRole;

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: NavRole[];
}

interface MenuGroup {
  label: string;
  collapsible: boolean;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: 'CORE',
    collapsible: false,
    items: [
      { title: 'Painel', url: '/', icon: LayoutDashboard, roles: ['master', 'admin', 'user'] },
      { title: 'Vendas', url: '/transactions', icon: TrendingUp, roles: ['master', 'admin'] },
      { title: 'Análise', url: '/leads', icon: BarChart3, roles: ['master', 'admin'] },
      { title: 'Metas', url: '/goals', icon: Target, roles: ['master', 'admin'] },
      { title: 'Coprodução', url: '/coproduction', icon: Wallet, roles: ['master', 'user'] },
    ],
  },
  {
    label: 'OPERAÇÃO',
    collapsible: true,
    items: [
      { title: 'Importar Dados', url: '/upload', icon: FileUp, roles: ['master', 'admin'] },
      { title: 'Cancelamentos TMB', url: '/tmb-cancellations', icon: Ban, roles: ['master', 'admin'] },
      { title: 'Cancelamentos Eduzz', url: '/eduzz-cancellations', icon: Ban, roles: ['master', 'admin'] },
      { title: 'Transações TMB', url: '/tmb-transactions', icon: Activity, roles: ['master', 'admin', 'user'] },
      { title: 'Transações Eduzz', url: '/eduzz-transactions', icon: Activity, roles: ['master', 'admin', 'user'] },
      { title: 'Internacional', url: '/international-sales', icon: Activity, roles: ['master', 'admin', 'user'] },
    ],
  },
  {
    label: 'ADMIN',
    collapsible: true,
    items: [
      { title: 'Equipe', url: '/users', icon: Users, roles: ['master', 'admin'] },
      { title: 'Clientes', url: '/clients', icon: Database, roles: ['master'] },
      { title: 'Integrações', url: '/webhook-config', icon: Link2, roles: ['master', 'admin'] },
      { title: 'Auditoria', url: '/duplicate-audit', icon: ShieldCheck, roles: ['master', 'admin'] },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { role } = useUserRole();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { settings: branding } = useBrandingSettings();
  const { resolvedTheme } = useTheme();

  const currentLogo = useMemo(() => {
    const isDark = resolvedTheme === 'dark';
    if (isDark && branding.logoUrlDark) return branding.logoUrlDark;
    if (!isDark && branding.logoUrl) return branding.logoUrl;
    return branding.logoUrl || branding.logoUrlDark || defaultLogo;
  }, [branding.logoUrl, branding.logoUrlDark, resolvedTheme]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const groupHasActiveItem = (items: MenuItem[]) =>
    items.some(item => isActive(item.url));

  return (
    <Sidebar collapsible="icon">
      {/* Header: Logo + App Name */}
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <img
              src={currentLogo}
              alt={branding.appName || 'Logo'}
              className="h-8 w-auto object-contain max-w-[140px]"
            />
          </div>
        ) : (
          <div className="flex justify-center">
            <img
              src={currentLogo}
              alt={branding.appName || 'Logo'}
              className="h-7 w-auto object-contain"
            />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="pt-2 px-2">
        {menuGroups.map((group) => {
          const visibleItems = group.items.filter(item => item.roles.includes(role));
          if (visibleItems.length === 0) return null;

          if (group.collapsible) {
            const isGroupActive = groupHasActiveItem(visibleItems);

            return (
              <Collapsible key={group.label} defaultOpen={isGroupActive} className="group/collapsible">
                <SidebarGroup>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/50 rounded-md transition-colors text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                      {group.label}
                      <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-180" />
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
                              className="h-9 text-[13px] font-normal text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground data-[active=true]:border-l-2 data-[active=true]:border-l-primary data-[active=true]:font-medium"
                            >
                              <NavLink
                                to={item.url}
                                className="flex items-center gap-3"
                                activeClassName=""
                              >
                                <item.icon className="h-[18px] w-[18px] shrink-0" />
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
              <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.url)}
                        tooltip={item.title}
                        className="h-9 text-[13px] font-normal text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground data-[active=true]:border-l-2 data-[active=true]:border-l-primary data-[active=true]:font-medium"
                      >
                        <NavLink
                          to={item.url}
                          className="flex items-center gap-3"
                          activeClassName=""
                        >
                          <item.icon className="h-[18px] w-[18px] shrink-0" />
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

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu>
          {(role === 'master' || role === 'admin') && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/settings')}
                tooltip="Configurações"
                className="h-9 text-[13px] font-normal text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground"
              >
                <NavLink
                  to="/settings"
                  className="flex items-center gap-3"
                  activeClassName=""
                >
                  <Settings className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  {!collapsed && <span>Configurações</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>

        {!collapsed && user && (
          <div className="mt-2 px-1">
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        )}

        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={signOut}
          className="justify-start gap-2 mt-1 text-muted-foreground hover:text-foreground h-9 text-[13px]"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
