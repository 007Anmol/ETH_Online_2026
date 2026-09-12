export const HASHSCAN_TESTNET = "https://hashscan.io/testnet";

export function hashscanTx(hash: string): string {
  return `${HASHSCAN_TESTNET}/transaction/${hash}`;
}

export function hashscanAddress(address: string): string {
  return `${HASHSCAN_TESTNET}/account/${address}`;
}

export function hashscanContract(address: string): string {
  return `${HASHSCAN_TESTNET}/contract/${address}`;
}

export const PRODUCT_STATUS = ["CREATED", "IN_TRANSIT", "DELIVERED", "SUSPECT_COUNTERFEIT", "RESOLVED"] as const;
export const SHIPMENT_STATUS = ["CREATED", "IN_TRANSIT", "RECEIVED", "CANCELLED"] as const;
export const ESCROW_STATUS = ["ACTIVE", "FROZEN", "RELEASED"] as const;
