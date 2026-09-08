import type {
	PaidResource,
	PaymentProof,
	PaymentRecord,
} from "../../../packages/shared/types/payment";
import type { PaymentNetwork } from "./client";

export type PaymentStore = {
	hasRequest(requestId: string): Promise<boolean>;
	save(record: PaymentRecord): Promise<void>;
};

export type PaymentRequirements = {
	resource: PaidResource;
	amount: bigint;
	currency: string;
	network: string;
	expiresAt: number;
};

export type PaymentDecision =
	| { authorized: true; payment: PaymentRecord }
	| { authorized: false; status: 402 | 409 | 400; error: string };

function parseProof(encoded: string): PaymentProof | undefined {
	try {
		const decoded = Buffer.from(encoded, "base64url").toString("utf8");
		const proof = JSON.parse(decoded) as Partial<PaymentProof>;

		if (
			typeof proof.requestId !== "string" ||
			typeof proof.resource !== "string" ||
			typeof proof.payer !== "string" ||
			typeof proof.amount !== "string" ||
			typeof proof.currency !== "string" ||
			typeof proof.network !== "string" ||
			typeof proof.transactionId !== "string" ||
			typeof proof.expiresAt !== "number"
		) {
			return undefined;
		}

		return proof as PaymentProof;
	} catch {
		return undefined;
	}
}

export async function verifyPayment(
	proofHeader: string | null,
	requirements: PaymentRequirements,
	network: PaymentNetwork,
	store: PaymentStore,
	now = Math.floor(Date.now() / 1000),
	expectedRequestId?: string,
): Promise<PaymentDecision> {
	if (!proofHeader) {
		return { authorized: false, status: 402, error: "Payment required" };
	}

	const proof = parseProof(proofHeader);
	if (!proof) {
		return { authorized: false, status: 400, error: "Invalid payment proof" };
	}
	if (expectedRequestId && proof.requestId !== expectedRequestId) {
		return { authorized: false, status: 400, error: "Request ID does not match payment proof" };
	}

	if (await store.hasRequest(proof.requestId)) {
		return { authorized: false, status: 409, error: "Payment request already used" };
	}
	if (proof.expiresAt <= now) {
		return { authorized: false, status: 402, error: "Payment proof expired" };
	}
	if (
		proof.resource !== requirements.resource ||
		proof.currency !== requirements.currency ||
		proof.network !== requirements.network
	) {
		return { authorized: false, status: 402, error: "Payment requirements do not match" };
	}

	let amount: bigint;
	try {
		amount = BigInt(proof.amount);
	} catch {
		return { authorized: false, status: 400, error: "Invalid payment amount" };
	}
	if (amount < requirements.amount) {
		return { authorized: false, status: 402, error: "Insufficient payment" };
	}
	if (!(await network.verifyPayment(proof))) {
		return { authorized: false, status: 402, error: "Payment could not be verified" };
	}

	const payment: PaymentRecord = {
		...proof,
		status: "VERIFIED",
		createdAt: now,
	};
	await store.save(payment);
	return { authorized: true, payment };
}
