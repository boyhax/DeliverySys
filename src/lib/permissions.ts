
export type Permission = 
  | '*:*'
  | 'orders:read'
  | 'orders:create'
  | 'orders:write'
  | 'orders:update_status'
  | 'analytics:read'
  | 'users:read'
  | 'users:write'
  | 'methods:read'
  | 'methods:write'
  | 'regions:read'
  | 'regions:write'
  | 'matrix:read'
  | 'providers:read'
  | 'roles:read'
  | 'channels:read';

export interface UserPermission {
  permission: string;
  conditions: string | null;
}

export function hasPermission(userPermissions: UserPermission[], requiredPermission: Permission): boolean {
  if (!userPermissions) return false;
  
  // Admin with wildcard always has permission
  if (userPermissions.some(p => p.permission === '*:*')) return true;
  
  return userPermissions.some(p => p.permission === requiredPermission);
}
