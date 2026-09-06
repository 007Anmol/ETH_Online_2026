import type {
  AnomalyDecision,
  BatchStatus,
  CheckpointType,
  EscrowStatus,
  ManufacturingOperationType,
  OrganizationType,
  Permission,
  ProductCategory,
  ProductEventType,
  ProductStatus,
  ResaleStatus,
  TagBindingAction,
  TagStatus,
  UserRole,
  VerificationResult,
} from "./enums";
import type { ManufacturingOperationStatus } from "./manufacturing";

type Json =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null;

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          type: OrganizationType;
          wallet_address: string;
          world_id_verified: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: OrganizationType;
          wallet_address: string;
          world_id_verified?: boolean;
          metadata?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
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
        Insert: {
          id?: string;
          wallet_address: string;
          organization_id?: string | null;
          role: UserRole;
          world_id_verified?: boolean;
          world_id_nullifier_hash?: string | null;
          display_name?: string | null;
          email?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      role_permissions: {
        Row: { role: UserRole; permission: Permission };
        Insert: { role: UserRole; permission: Permission };
        Update: Partial<Database["public"]["Tables"]["role_permissions"]["Insert"]>;
        Relationships: [];
      };
      batches: {
        Row: {
          id: string;
          batch_code: string;
          batch_id_hash: string;
          manufacturer_org_id: string;
          product_name: string;
          product_category: ProductCategory;
          plant_id: string;
          manufacturing_date: string;
          quantity: number;
          minted_count: number;
          status: BatchStatus;
          chain_tx_hash: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          batch_code: string;
          batch_id_hash: string;
          manufacturer_org_id: string;
          product_name: string;
          product_category: ProductCategory;
          plant_id: string;
          manufacturing_date?: string;
          quantity: number;
          minted_count?: number;
          status?: BatchStatus;
          chain_tx_hash?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["batches"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          product_code: string;
          product_id_hash: string;
          token_id: number | null;
          batch_id: string;
          serial_number: string;
          manufacturer_org_id: string;
          status: ProductStatus;
          chain_tx_hash: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_code: string;
          product_id_hash: string;
          token_id?: number | null;
          batch_id: string;
          serial_number: string;
          manufacturer_org_id: string;
          status?: ProductStatus;
          chain_tx_hash?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      nfc_tags: {
        Row: {
          id: string;
          tag_uid: string;
          tag_id_hash: string;
          product_id: string | null;
          status: TagStatus;
          provisioned_at: string;
          bound_at: string | null;
          revoked_at: string | null;
          revoked_reason: string | null;
          chain_tx_hash: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tag_uid: string;
          tag_id_hash: string;
          product_id?: string | null;
          status?: TagStatus;
          provisioned_at?: string;
          bound_at?: string | null;
          revoked_at?: string | null;
          revoked_reason?: string | null;
          chain_tx_hash?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["nfc_tags"]["Insert"]>;
        Relationships: [];
      };
      tag_binding_history: {
        Row: {
          id: string;
          tag_id: string;
          product_id: string;
          action: TagBindingAction;
          performed_by: string | null;
          reason: string | null;
          chain_tx_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tag_id: string;
          product_id: string;
          action: TagBindingAction;
          performed_by?: string | null;
          reason?: string | null;
          chain_tx_hash?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["tag_binding_history"]["Insert"]>;
        Relationships: [];
      };
      verification_nonces: {
        Row: {
          id: string;
          tag_id: string;
          nonce_hash: string;
          consumed: boolean;
          consumed_at: string | null;
          chain_tx_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tag_id: string;
          nonce_hash: string;
          consumed?: boolean;
          consumed_at?: string | null;
          chain_tx_hash?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["verification_nonces"]["Insert"]>;
        Relationships: [];
      };
      verification_attempts: {
        Row: {
          id: string;
          tag_id: string | null;
          product_id: string | null;
          raw_payload: Json;
          result: VerificationResult;
          failure_reason: string | null;
          scanned_by: string | null;
          location: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          tag_id?: string | null;
          product_id?: string | null;
          raw_payload: Json;
          result: VerificationResult;
          failure_reason?: string | null;
          scanned_by?: string | null;
          location?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["verification_attempts"]["Insert"]>;
        Relationships: [];
      };
      manufacturing_operations: {
        Row: {
          id: string;
          operation_type: ManufacturingOperationType;
          batch_id: string | null;
          product_id: string | null;
          performed_by: string | null;
          chain_tx_hash: string | null;
          status: ManufacturingOperationStatus;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          operation_type: ManufacturingOperationType;
          batch_id?: string | null;
          product_id?: string | null;
          performed_by?: string | null;
          chain_tx_hash?: string | null;
          status?: ManufacturingOperationStatus;
          error_message?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["manufacturing_operations"]["Insert"]
        >;
        Relationships: [];
      };
      product_events: {
        Row: {
          id: string;
          event_type: ProductEventType;
          product_id: string | null;
          batch_id: string | null;
          tag_id: string | null;
          payload: Json;
          chain_tx_hash: string | null;
          block_number: number | null;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          event_type: ProductEventType;
          product_id?: string | null;
          batch_id?: string | null;
          tag_id?: string | null;
          payload?: Json;
          chain_tx_hash?: string | null;
          block_number?: number | null;
          occurred_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_events"]["Insert"]>;
        Relationships: [];
      };
      checkpoints: {
        Row: {
          id: string;
          product_id: string;
          tag_id: string | null;
          checkpoint_type: CheckpointType;
          custodian_org_id: string | null;
          latitude: number | null;
          longitude: number | null;
          anomaly_decision: AnomalyDecision | null;
          chain_tx_hash: string | null;
          recorded_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      custody_transfers: {
        Row: {
          id: string;
          product_id: string;
          from_org_id: string | null;
          to_org_id: string | null;
          chain_tx_hash: string | null;
          transferred_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      escrows: {
        Row: {
          id: string;
          product_id: string;
          buyer_org_id: string | null;
          seller_org_id: string | null;
          amount: number | null;
          currency: string | null;
          status: EscrowStatus;
          chain_tx_hash: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      ownership_records: {
        Row: {
          id: string;
          product_id: string;
          owner_wallet_address: string;
          privy_user_id: string | null;
          claimed_at: string;
          chain_tx_hash: string | null;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      resale_listings: {
        Row: {
          id: string;
          product_id: string;
          seller_wallet_address: string;
          buyer_wallet_address: string | null;
          status: ResaleStatus;
          escrow_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      organization_type: OrganizationType;
      permission: Permission;
      batch_status: BatchStatus;
      product_category: ProductCategory;
      product_status: ProductStatus;
      tag_status: TagStatus;
      verification_result: VerificationResult;
      anomaly_decision: AnomalyDecision;
      checkpoint_type: CheckpointType;
      escrow_status: EscrowStatus;
      resale_status: ResaleStatus;
      product_event_type: ProductEventType;
    };
    CompositeTypes: Record<string, never>;
  };
};
