const DISABLED_VALUES = new Set(["0", "false", "no", "off"]);

export function parseAiEnabled(value?: string | null) {
  if (!value) return true;

  return !DISABLED_VALUES.has(value.trim().toLowerCase());
}

export const AI_FEATURES_ENABLED = parseAiEnabled(
  process.env.NEXT_PUBLIC_AI_ENABLED,
);
