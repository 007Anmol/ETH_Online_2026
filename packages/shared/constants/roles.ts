export { USER_ROLES, PERMISSIONS } from "../types/enums";
export type { UserRole, Permission } from "../types/enums";

export const MANUFACTURER_DASHBOARD_ROLES = [
  "MANUFACTURER",
  "FACTORY_OPERATOR",
  "ADMIN",
] as const;

export function isManufacturerRole(role: string): boolean {
  return (MANUFACTURER_DASHBOARD_ROLES as readonly string[]).includes(role);
}
