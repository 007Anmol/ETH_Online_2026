import { NextResponse } from "next/server";
import { createWalletClient, http, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hederaTestnet } from "viem/chains";
import * as fs from "fs";
import * as path from "path";

export async function GET() {
  try {
    const privateKey = process.env.HEDERA_OPERATOR_PRIVATE_KEY;
    if (!privateKey) throw new Error("Missing HEDERA_OPERATOR_PRIVATE_KEY");

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    const walletClient = createWalletClient({
      account,
      chain: hederaTestnet,
      transport: http("https://testnet.hashio.io/api"),
    });

    const publicClient = createPublicClient({
      chain: hederaTestnet,
      transport: http("https://testnet.hashio.io/api"),
    });

    const abiRaw = fs.readFileSync(path.resolve(process.cwd(), "../packages/shared/abi/VeriChainRegistry.json"), "utf-8");
    const binRaw = fs.readFileSync(path.resolve(process.cwd(), "./scripts/VeriChainRegistry.bin"), "utf-8");

    const abi = JSON.parse(abiRaw);
    const bytecode = `0x${binRaw.trim()}` as `0x${string}`;

    const hash = await walletClient.deployContract({
      abi,
      bytecode,
      gas: 2_000_000n,
      type: "legacy",
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60000 });
    
    return NextResponse.json({ success: true, address: receipt.contractAddress });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
