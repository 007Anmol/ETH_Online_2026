export type TelemetryPoint = {
	productId: string;
	latitude: number;
	longitude: number;
	timestamp: number;
	checkpoint: string;
	expectedRoute?: string[];
	actualRoute?: string[];
};

export type TelemetryBatch = {
	current: TelemetryPoint;
	previous?: TelemetryPoint;
	recent?: TelemetryPoint[];
	requestId: string;
};
