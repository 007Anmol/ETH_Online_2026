import { PlaceholderPage } from "@/components/placeholder-page";

export default function NfcBindPage() {
  return (
    <PlaceholderPage
      owner="Saachi"
      title="Bind NFC tag"
      description="Pick a minted product that is not TAG_BOUND and attach exactly one tag UID."
      nextSteps={[
        "POST /api/nfc/bind with { product_id, tag_uid }.",
        "Reject a second bind of the same tag or a second active tag on the same product.",
        "Write nfc_tags, tag_binding_history, and set product status to TAG_BOUND.",
      ]}
    />
  );
}
