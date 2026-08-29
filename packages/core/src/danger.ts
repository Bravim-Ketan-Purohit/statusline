/**
 * Production detection.
 *
 * A safety tile exists to stop you running against prod by accident, so the
 * match has to be tight in both directions: `prod` must fire on `eks-prod-1`
 * and must not fire on `product-api`. Matching on a whole word or a whole
 * name segment gives exactly that -- segments being the pieces either side of
 * the separators real infrastructure names use.
 */

const SEP = /[^a-z0-9]+/i;

export function isDangerous(value: string | undefined, patterns: string[]): boolean {
  if (!value) return false;
  const segments = value.toLowerCase().split(SEP).filter(Boolean);
  return patterns.some((raw) => {
    const p = raw.trim().toLowerCase();
    return p.length > 0 && segments.includes(p);
  });
}

export const DEFAULT_DANGER_PATTERNS = ["prod", "production", "prd", "live"];
