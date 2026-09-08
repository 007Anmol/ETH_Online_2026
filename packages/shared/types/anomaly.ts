export type AnomalyLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AnomalyFinding = {
	type:
		| "IMPOSSIBLE_VELOCITY"
		| "ROUTE_DEVIATION"
		| "DUPLICATE_LOCATION";
	points: number;
	message: string;
};

export type AnomalyResult = {
	productId: string;
	riskScore: number;
	level: AnomalyLevel;
	findings: string[];
	explanation: string;
	shouldFreeze: boolean;
};
