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
  Globe,
  GitCompare,
  Layers,
} from 'lucide-react';
import defaultLogo from '@/assets/default-logo.png';
import { useMemo } from 'react';

type NavRole = AppRole;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = React.ComponentType<any>;

interface MenuItem {
  title: string;
  url: string;
  icon: IconComponent;
  roles: NavRole[];
}

interface SubGroup {
  title: string;
  icon: IconComponent;
  items: MenuItem[];
  roles: NavRole[];
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
  subGroups?: SubGroup[];
}

const menuGroups: MenuGroup[] = [
  {
    label: 'CORE',
    
    items: [
      { title: 'Painel', url: '/', icon: LayoutDashboard, roles: ['master', 'admin', 'user'] },
      { title: 'IGPL', url: '/igpl', icon: Activity, roles: ['master', 'admin', 'user'] },
      { title: 'Leads', url: '/leads', icon: BarChart3, roles: ['master', 'admin', 'user'] },
    ],
    subGroups: [
      {
        title: 'Vendas',
        icon: TrendingUp,
        roles: ['master', 'admin'],
        items: [
          { title: 'Hotmart', url: '/transactions', icon: TrendingUp, roles: ['master', 'admin'] },
          { title: 'TMB', url: '/tmb-transactions', icon: Wallet, roles: ['master', 'admin'] },
          { title: 'Eduzz', url: '/eduzz-transactions', icon: Activity, roles: ['master', 'admin'] },
          { title: 'Internacional', url: '/international-sales', icon: Globe, roles: ['master', 'admin'] },
          { title: 'Comparativo', url: '/comparative', icon: GitCompare, roles: ['master', 'admin'] },
        ],
      },
      {
        title: 'Análise',
        icon: BarChart3,
        roles: ['master', 'admin', 'user'],
        items: [
          { title: 'Funil', url: '/leads/funnel', icon: Layers, roles: ['master', 'admin', 'user'] },
        ],
      },
    ],
  },
  {
    label: 'OPERAÇÃO',
    
    items: [
      { title: 'Metas', url: '/goals', icon: Target, roles: ['master', 'admin'] },
      { title: 'Coprodução', url: '/coproduction', icon: Wallet, roles: ['master', 'user'] },
      { title: 'Importar Dados', url: '/upload', icon: FileUp, roles: ['master', 'admin'] },
      { title: 'Cancel. TMB', url: '/tmb-cancellations', icon: Ban, roles: ['master', 'admin'] },
      { title: 'Cancel. Eduzz', url: '/eduzz-cancellations', icon: Ban, roles: ['master', 'admin'] },
    ],
  },
  {
    label: 'ADMIN',
    
    items: [
      { title: 'Equipe', url: '/users', icon: Users, roles: ['master', 'admin'] },
      { title: 'Clientes', url: '/clients', icon: Database, roles: ['master'] },
      { title: 'Integrações', url: '/webhook-config', icon: Link2, roles: ['master', 'admin'] },
      { title: 'Auditoria', url: '/duplicate-audit', icon: ShieldCheck, roles: ['master', 'admin'] },
    ],
  },
];

const menuBtnClass = "h-10 text-[13px] font-normal text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-foreground/5 data-[active=true]:bg-primary/10 data-[active=true]:text-sidebar-foreground data-[active=true]:font-medium";

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
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const subGroupHasActive = (items: MenuItem[]) => items.some(i => isActive(i.url));

  const roleLabel = role === 'master' ? 'Master' : role === 'admin' ? 'Admin' : 'Cliente';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <img src={currentLogo} alt={branding.appName || 'Logo'} className="h-8 w-auto object-contain max-w-[140px]" />
          </div>
        ) : (
          <div className="flex justify-center">
            <img src={currentLogo} alt={branding.appName || 'Logo'} className="h-7 w-auto object-contain" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="pt-2 px-2">
        {menuGroups.map((group) => {
          const visibleItems = group.items.filter(i => i.roles.includes(role));
          const visibleSubGroups = (group.subGroups || []).filter(sg =>
            sg.roles.includes(role) && sg.items.some(i => i.roles.includes(role))
          );

          if (visibleItems.length === 0 && visibleSubGroups.length === 0) return null;

          return (
            <SidebarGroup key={group.label} className="pb-3">
              <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-foreground/50 uppercase mb-1.5">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title} className={menuBtnClass}>
                        <NavLink to={item.url} className="flex items-center gap-3" activeClassName="">
                          <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}

                  {visibleSubGroups.map((sg) => {
                    const sgItems = sg.items.filter(i => i.roles.includes(role));
                    const isOpen = subGroupHasActive(sgItems);

                    return (
                      <Collapsible key={sg.title} defaultOpen={isOpen} className="group/sub">
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                              tooltip={sg.title}
                              className="h-10 text-[13px] font-normal text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-transparent cursor-pointer"
                            >
                              <sg.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                              <span className="flex-1">{sg.title}</span>
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]/sub:rotate-180" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                        </SidebarMenuItem>
                        <CollapsibleContent>
                          {sgItems.map((item) => (
                            <SidebarMenuItem key={item.url}>
                              <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title} className={`${menuBtnClass} pl-9`}>
                                <NavLink to={item.url} className="flex items-center gap-3" activeClassName="">
                                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                                  <span>{item.title}</span>
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
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
              <SidebarMenuButton asChild isActive={isActive('/settings')} tooltip="Configurações" className={menuBtnClass}>
                <NavLink to="/settings" className="flex items-center gap-3" activeClassName="">
                  <Settings className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  {!collapsed && <span>Configurações</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>

        {!collapsed && user && (
          <div className="mt-2 px-1 flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-foreground truncate">{user.email}</p>
              <span className="text-[10px] text-muted-foreground">{roleLabel}</span>
            </div>
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
