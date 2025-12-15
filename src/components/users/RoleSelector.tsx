import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppRole } from '@/hooks/useUserRole';
import { Crown, User } from 'lucide-react';

interface RoleSelectorProps {
  currentRole: AppRole;
  onRoleChange: (newRole: AppRole) => void;
  disabled?: boolean;
  isCurrentUser?: boolean;
}

export function RoleSelector({ 
  currentRole, 
  onRoleChange, 
  disabled,
  isCurrentUser 
}: RoleSelectorProps) {
  if (isCurrentUser) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        {currentRole === 'master' ? (
          <Crown className="h-4 w-4 text-amber-500" />
        ) : (
          <User className="h-4 w-4" />
        )}
        <span>{currentRole === 'master' ? 'Master' : 'Cliente'}</span>
        <span className="text-xs">(você)</span>
      </div>
    );
  }

  return (
    <Select
      value={currentRole}
      onValueChange={(value) => onRoleChange(value as AppRole)}
      disabled={disabled}
    >
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="master">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            Master
          </div>
        </SelectItem>
        <SelectItem value="user">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Cliente
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
