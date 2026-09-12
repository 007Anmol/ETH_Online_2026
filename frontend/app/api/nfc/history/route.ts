import { NextResponse } from "next/server";
import { deriveOnChainId } from "@/lib/crypto/hash";
import { fetchGraphNonce } from "@/lib/graphql";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tagUid = url.searchParams.get("tag_uid")?.trim() ?? "";
  const nonce = url.searchParams.get("nonce")?.trim() ?? "";
  if (!tagUid || !nonce) {
    return NextResponse.json({ error: "tag_uid and nonce are required" }, { status: 400 });
  }

  const consumed = await fetchGraphNonce(deriveOnChainId(`${tagUid}:${nonce}`));
  return NextResponse.json({ consumed });
}
