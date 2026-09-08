import type { PaymentProof } from "../../../packages/shared/types/payment";

export interface PaymentNetwork {
	verifyPayment(proof: PaymentProof): Promise<boolean>;
}
