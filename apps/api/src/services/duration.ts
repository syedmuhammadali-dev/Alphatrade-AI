const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parses simple durations like "15m", "30d", "1h" into milliseconds. */
export function parseDurationMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration format: "${duration}" (expected e.g. "15m", "30d")`);
  }
  const [, amount, unit] = match;
  const unitMs = UNIT_MS[unit as string];
  if (unitMs === undefined) {
    throw new Error(`Invalid duration unit: "${unit}"`);
  }
  return Number(amount) * unitMs;
}
