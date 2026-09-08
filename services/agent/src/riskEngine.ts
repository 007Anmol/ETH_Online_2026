import type { AnomalyFinding, AnomalyResult } from "../../../packages/shared/types/anomaly";
import type { TelemetryPoint } from "../../../packages/shared/types/checkpoint";

const EARTH_RADIUS_KM = 6371;
const MAX_TRANSPORT_KMH = 950;
const HIGH_RISK_THRESHOLD = 61;

export function haversineDistanceKm(first: TelemetryPoint, second: TelemetryPoint): number {
	const latitudeDelta = ((second.latitude - first.latitude) * Math.PI) / 180;
	const longitudeDelta = ((second.longitude - first.longitude) * Math.PI) / 180;
	const firstLatitude = (first.latitude * Math.PI) / 180;
	const secondLatitude = (second.latitude * Math.PI) / 180;
	const haversine =
		Math.sin(latitudeDelta / 2) ** 2 +
		Math.cos(firstLatitude) *
			Math.cos(secondLatitude) *
			Math.sin(longitudeDelta / 2) ** 2;

	return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}

function riskLevel(score: number): AnomalyResult["level"] {
	if (score >= 81) return "CRITICAL";
	if (score >= HIGH_RISK_THRESHOLD) return "HIGH";
	if (score >= 31) return "MEDIUM";
	return "LOW";
}

function validatePoint(point: TelemetryPoint): void {
	if (!point.productId || !point.checkpoint) throw new Error("Missing telemetry identity");
	if (!Number.isFinite(point.latitude) || point.latitude < -90 || point.latitude > 90) {
		throw new Error("Invalid latitude");
	}
	if (!Number.isFinite(point.longitude) || point.longitude < -180 || point.longitude > 180) {
		throw new Error("Invalid longitude");
	}
	if (!Number.isFinite(point.timestamp) || point.timestamp <= 0) {
		throw new Error("Invalid timestamp");
	}
}

export function evaluateTelemetry(
	current: TelemetryPoint,
	previous?: TelemetryPoint,
	recent: TelemetryPoint[] = [],
): AnomalyResult {
	validatePoint(current);
	if (previous) validatePoint(previous);
	recent.forEach(validatePoint);

	const findings: AnomalyFinding[] = [];

	if (previous && current.timestamp > previous.timestamp) {
		const elapsedHours = (current.timestamp - previous.timestamp) / 3600;
		const velocity = haversineDistanceKm(previous, current) / elapsedHours;

		if (velocity > MAX_TRANSPORT_KMH) {
			findings.push({
				type: "IMPOSSIBLE_VELOCITY",
				points: 50,
				message: `${current.checkpoint} implies ${Math.round(velocity)} km/h, above the ${MAX_TRANSPORT_KMH} km/h limit.`,
			});
		}
	}

	if (current.expectedRoute?.length && current.actualRoute?.length) {
		const routeChanged = current.actualRoute.some(
			(checkpoint, index) => checkpoint !== current.expectedRoute?.[index],
		);

		if (routeChanged) {
			findings.push({
				type: "ROUTE_DEVIATION",
				points: 30,
				message: "Observed checkpoints differ from the configured route.",
			});
		}
	}

	const duplicate = recent.some(
		(point) =>
			point.checkpoint === current.checkpoint &&
			Math.abs(point.timestamp - current.timestamp) <= 1800,
	);

	if (duplicate) {
		findings.push({
			type: "DUPLICATE_LOCATION",
			points: 20,
			message: "The product appeared at this checkpoint again within 30 minutes.",
		});
	}

	const riskScore = Math.min(
		100,
		findings.reduce((score, finding) => score + finding.points, 0),
	);

	return {
		productId: current.productId,
		riskScore,
		level: riskLevel(riskScore),
		findings: findings.map((finding) => finding.message),
		explanation:
			findings.length > 0
				? findings.map((finding) => finding.message).join(" ")
				: "Telemetry is consistent with the configured route and transport limits.",
		shouldFreeze: riskScore >= HIGH_RISK_THRESHOLD,
	};
}
