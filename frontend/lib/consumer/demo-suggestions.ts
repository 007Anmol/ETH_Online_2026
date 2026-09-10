/**
 * Re-exported at the provider boundary (not `lib/consumer/mocks/`) so UI
 * components can list demo IDs without importing the mock module directly —
 * consistent with "component -> registry/provider, never component -> mock".
 */
export { DEMO_PRODUCT_IDS as SUGGESTED_DEMO_IDS } from "@/lib/consumer/mocks/demo-data";
