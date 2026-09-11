export type Hex32 = `0x${string}`;

export enum BatchStatus {
  Created = 0,
  Minted = 1,
}

export enum TagStatus {
  Unset = 0,
  Bound = 1,
  Revoked = 2,
}

export type OnChainBatch = {
  exists: boolean;
  quantity: number;
  mintedCount: number;
  status: BatchStatus;
};

export type OnChainProduct = {
  exists: boolean;
  batchIdHash: Hex32;
  boundTagIdHash: Hex32;
};

export type OnChainTag = {
  exists: boolean;
  status: TagStatus;
  productIdHash: Hex32;
};

export type ManufacturerPermission =
  | "CREATE_BATCH"
  | "MINT_PRODUCT"
  | "REGISTER_TAG"
  | "VIEW_PROVENANCE";

export type UserRole =
  | "MANUFACTURER"
  | "FACTORY_OPERATOR"
  | "DISTRIBUTOR"
  | "LOGISTICS_PROVIDER"
  | "RETAILER"
  | "CONSUMER"
  | "ADMIN";

export type OrganizationRow = {
  id: string;
  name: string;
  type: string;
  wallet_address: string;
  world_id_verified: boolean;
};

export type ProfileRow = {
  id: string;
  wallet_address: string;
  organization_id: string | null;
  role: UserRole;
  world_id_verified: boolean;
  display_name: string | null;
};
