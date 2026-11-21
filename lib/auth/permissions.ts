import { RoleName } from "@prisma/client";

export const ADMIN_ROLES: RoleName[] = [RoleName.PLATFORM_ADMIN];

export function isPlatformAdmin(role?: string): boolean {
  return role === RoleName.PLATFORM_ADMIN;
}

export function isAdmin(role?: string): boolean {
  return role === RoleName.PLATFORM_ADMIN;
}

export function canAssignRole(actorRole: string, targetRole: RoleName): boolean {
  if (actorRole === RoleName.PLATFORM_ADMIN) return true;
  return false;
}

export function isTenantUser(role?: string): boolean {
  return role === RoleName.USER;
}
