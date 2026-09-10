import "server-only";

import { isAddress, isHex, verifyMessage } from "viem";

export async function verifyWalletSignature(input: {
  address: string;
  message: string;
  signature: string;
}): Promise<boolean> {
  const address = input.address.trim();
  const signature = input.signature.trim();

  if (!input.message || !isAddress(address) || !isHex(signature)) {
    return false;
  }

  try {
    return await verifyMessage({
      address,
      message: input.message,
      signature,
    });
  } catch {
    return false;
  }
}
