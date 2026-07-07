import type { CircuitDetails } from "@fieldcert/cert-schemas";

/**
 * Maximum permitted earth fault loop impedance Zs for overcurrent devices,
 * per BS 7671:2018+A2:2022 Table 41.3 (0.4s disconnection, U0 = 230V).
 *
 * The tabulated values derive from Zs = (U0 x Cmin) / Ia, with Cmin = 0.95
 * and Ia the current causing instantaneous operation:
 *   Type B: 5 x In, Type C: 10 x In, Type D: 20 x In.
 */
const CMIN = 0.95;
const U0 = 230;

const CURVE_MULTIPLIER: Record<string, number> = { B: 5, C: 10, D: 20 };

export function maxZsOhms(circuit: CircuitDetails): number | null {
  const ocpd = circuit.ocpd;
  if (!ocpd?.ratingA || !ocpd.curve) return null;
  const multiplier = CURVE_MULTIPLIER[ocpd.curve];
  if (!multiplier) return null;
  return (U0 * CMIN) / (multiplier * ocpd.ratingA);
}

/**
 * GN3 rule of thumb: a measured (cold) Zs should not exceed 80% of the
 * tabulated maximum, to allow for conductor resistance rising at operating
 * temperature.
 */
export const MEASURED_ZS_FACTOR = 0.8;
