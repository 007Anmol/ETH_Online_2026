export const SESSION_COOKIE = "verichain_session";

/** Seeded manufacturer wallet — must match supabase/seed.sql */
export const DEMO_MANUFACTURER_WALLET =
  "0x1111111111111111111111111111111111111111";

export const DEMO_MANUFACTURER_NAME = "VeriChain Demo Works";

/** One watch so NFC bind can be built before Harsheel mints. */
export const DEMO_BATCH_CODE = "SAACHI-DEV-001";
export const DEMO_PRODUCT_CODE = "VC-SAACHI-000001";
export const DEMO_SERIAL_NUMBER = "SN-SAACHI-000001";
export const DEMO_PRODUCT_NAME = "Rado HyperChrome";
export const DEMO_PLANT_ID = "MH-01";
export const DEMO_TAG_UID = "04DEADBEEF01";

/** Harsheel's official 3-unit batch — shared demo identity. */
export const SHARED_DEMO_BATCH_CODE = "RADO-2026-001";

/** 16-byte AES-128 key for Phase 1 taps. Override with NFC_MASTER_KEY. */
export const DEMO_NFC_MASTER_KEY = "00112233445566778899aabbccddeeff";
