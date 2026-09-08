import type { PaymentProof } from "../../../packages/shared/types/payment";

export interface PaymentNetwork {
	verifyPayment(proof: PaymentProof): Promise<boolean>;
}

export class HederaMirrorPaymentNetwork implements PaymentNetwork {
	private readonly mirrorUrl = (process.env.HEDERA_MIRROR_NODE_URL ?? "https://testnet.mirrornode.hedera.com").replace(/\/$/, "");
	private readonly receiver = process.env.HEDERA_PAYMENT_RECEIVER;

	async verifyPayment(proof: PaymentProof): Promise<boolean> {
		if (proof.network !== "hedera-testnet" && proof.network !== "hedera-mainnet") return false;
		if (!this.receiver || proof.currency !== "HBAR") return false;
		const response = await fetch(`${this.mirrorUrl}/api/v1/transactions/${encodeURIComponent(proof.transactionId)}`);
		if (!response.ok) return false;
		const body = (await response.json()) as { transactions?: Array<{ result?: string; transfers?: Array<{ account: string; amount: number }> }> };
		const transaction = body.transactions?.[0];
		if (!transaction || transaction.result !== "SUCCESS") return false;
		const requiredTinybar = BigInt(proof.amount);
		return transaction.transfers?.some((transfer) => transfer.account === this.receiver && BigInt(transfer.amount) >= requiredTinybar) ?? false;
	}
}
