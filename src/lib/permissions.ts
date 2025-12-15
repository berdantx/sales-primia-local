import { AppRole } from '@/hooks/useUserRole';

export interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
}

// Route permissions configuration
export const routePermissions: Record<string, AppRole[]> = {
  '/': ['master', 'admin', 'user'],
  '/comparative': ['master', 'admin'],
  '/upload': ['master', 'admin'],
  '/transactions': ['master', 'admin', 'user'],
  '/tmb-transactions': ['master', 'admin', 'user'],
  '/webhook-logs': ['master', 'admin'],
  '/goals': ['master', 'admin', 'user'],
  '/settings': ['master', 'admin'],
  '/users': ['master'],
};

export function hasRouteAccess(path: string, role: AppRole): boolean {
  const allowedRoles = routePermissions[path];
  if (!allowedRoles) return true; // Allow access to undefined routes
  return allowedRoles.includes(role);
}

export function filterMenuByRole<T extends { url: string; roles: AppRole[] }>(
  items: T[],
  role: AppRole
): T[] {
  return items.filter(item => item.roles.includes(role));
}
