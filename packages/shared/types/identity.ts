import type { OrganizationType, Permission, UserRole } from "./enums";

export type Organization = {
  id: string;
  name: string;
  type: OrganizationType;
  wallet_address: string;
  world_id_verified: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  wallet_address: string;
  organization_id: string | null;
  role: UserRole;
  world_id_verified: boolean;
  world_id_nullifier_hash: string | null;
  display_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type RolePermission = {
  role: UserRole;
  permission: Permission;
};

export type Session = {
  walletAddress: string;
  role: UserRole;
  profileId: string;
  organizationId: string | null;
  displayName: string | null;
};
