"use client";

import { useState } from "react";
import type { Abi, Hex } from "viem";
import { useWalletClient } from "wagmi";

import { sendHederaWalletCall } from "./hederaTx";

type WriteParams = {
  address: `0x${string}`;
  abi: Abi | readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
};

type WriteOptions = {
  onSuccess?: (hash: Hex) => void;
  onError?: (error: Error) => void;
};

/** Browser writes that Hashio will accept (legacy type-0, no EIP-1559). */
export function useHederaWrite() {
  const { data: walletClient } = useWalletClient();
  const [data, setData] = useState<Hex>();
  const [error, setError] = useState<Error | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function writeHederaContract(params: WriteParams, options?: WriteOptions) {
    if (!walletClient) {
      const err = new Error("Connect a Hedera wallet first.");
      setError(err);
      options?.onError?.(err);
      return;
    }

    setIsPending(true);
    setError(null);
    try {
      const hash = await sendHederaWalletCall(walletClient, {
        address: params.address,
        abi: params.abi as Abi,
        functionName: params.functionName,
        args: params.args,
        value: params.value,
      });
      setData(hash);
      options?.onSuccess?.(hash);
      return hash;
    } catch (caught) {
      const err = caught instanceof Error ? caught : new Error("Hedera transaction failed");
      setError(err);
      options?.onError?.(err);
    } finally {
      setIsPending(false);
    }
  }

  return { writeHederaContract, data, error, isPending };
}
