import {
  DEMO_PRODUCT_CATEGORY,
  DEMO_TAG_UID,
} from "../lib/constants";
import { placeholderHash, normalizeTagUid, isTagUid } from "../lib/crypto/hash";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  isProductCategory,
  productCategoryLabel,
} from "../lib/types";
import { createReporter } from "./test-helpers";

const { check, finish } = createReporter("Shared / category helpers");

check(
  "luxury categories are WATCHES, SHOES, BAGS, APPAREL",
  PRODUCT_CATEGORIES.join(",") === "WATCHES,SHOES,BAGS,APPAREL",
  PRODUCT_CATEGORIES.join(","),
);

check(
  "every category has a display label",
  PRODUCT_CATEGORIES.every((category) => PRODUCT_CATEGORY_LABELS[category].length > 0),
);

check("WATCHES is a product category", isProductCategory("WATCHES"));
check("SHOES is a product category", isProductCategory("SHOES"));
check("BAGS is a product category", isProductCategory("BAGS"));
check("APPAREL is a product category", isProductCategory("APPAREL"));

check("legacy free-text is not a category", !isProductCategory("Luxury watch"));
check("lowercase is not a category", !isProductCategory("watches"));
check("empty string is not a category", !isProductCategory(""));
check("expiry-era junk is not a category", !isProductCategory("WATCH"));

check("demo seed category is a valid enum value", isProductCategory(DEMO_PRODUCT_CATEGORY));

check("label for WATCHES", productCategoryLabel("WATCHES") === "Watches");
check("label for SHOES", productCategoryLabel("SHOES") === "Shoes");
check("label for BAGS", productCategoryLabel("BAGS") === "Bags");
check("label for APPAREL", productCategoryLabel("APPAREL") === "Apparel");
check("label for null is em dash", productCategoryLabel(null) === "—");
check("label for undefined is em dash", productCategoryLabel(undefined) === "—");
check(
  "unknown value is shown as-is until migration maps it",
  productCategoryLabel("Luxury watch") === "Luxury watch",
);

const hash = placeholderHash("SAACHI-DEV-001");
check("placeholderHash is 0x + 64 hex chars", /^0x[0-9a-f]{64}$/.test(hash), hash);
check(
  "placeholderHash is stable",
  placeholderHash("SAACHI-DEV-001") === hash,
);

check(
  "normalizeTagUid strips 0x, colons, spaces",
  normalizeTagUid(" 0x04:de:ad:be:ef:01 ") === DEMO_TAG_UID,
);
check("demo tag UID is valid", isTagUid(DEMO_TAG_UID));
check("short tag UID is rejected", !isTagUid("04AABB"));
check("non-hex tag UID is rejected", !isTagUid("not-a-tag"));

finish();
