import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ManufacturerPermission,
  OrganizationRow,
  ProfileRow,
  UserRole,
} from "@/lib/blockchain/types";

function normalizeWallet(walletAddress: string): string {
  return walletAddress.trim().toLowerCase();
}

export async function getOrganizationByWallet(
  supabase: SupabaseClient,
  walletAddress: string,
): Promise<OrganizationRow | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, type, wallet_address, world_id_verified")
    .eq("wallet_address", normalizeWallet(walletAddress))
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as OrganizationRow | null;
}

export async function getProfileByWallet(
  supabase: SupabaseClient,
  walletAddress: string,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, wallet_address, organization_id, role, world_id_verified, display_name")
    .eq("wallet_address", normalizeWallet(walletAddress))
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as ProfileRow | null;
}

export async function getPermissionsForRole(
  supabase: SupabaseClient,
  role: UserRole,
): Promise<ManufacturerPermission[]> {
  const { data, error } = await supabase
    .from("role_permissions")
    .select("permission")
    .eq("role", role);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.permission as ManufacturerPermission);
}

export async function walletHasPermission(
  supabase: SupabaseClient,
  walletAddress: string,
  permission: ManufacturerPermission,
): Promise<{
  allowed: boolean;
  profile: ProfileRow | null;
  organization: OrganizationRow | null;
  reason?: string;
}> {
  const profile = await getProfileByWallet(supabase, walletAddress);
  if (!profile) {
    return {
      allowed: false,
      profile: null,
      organization: null,
      reason: "No profile mapped to this wallet",
    };
  }

  const permissions = await getPermissionsForRole(supabase, profile.role);
  if (!permissions.includes(permission)) {
    return {
      allowed: false,
      profile,
      organization: null,
      reason: `Role ${profile.role} lacks permission ${permission}`,
    };
  }

  const organization = profile.organization_id
    ? (
        await supabase
          .from("organizations")
          .select("id, name, type, wallet_address, world_id_verified")
          .eq("id", profile.organization_id)
          .maybeSingle()
      ).data
    : null;

  return {
    allowed: true,
    profile,
    organization: (organization as OrganizationRow | null) ?? null,
  };
}
