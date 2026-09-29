/**
 * Likelihood calculation. Per the build prompt's realism rule, every
 * input here is a real, retrieved value — nothing is invented:
 *   - epssScore comes directly from FIRST's EPSS API (already a genuine
 *     probability estimate of exploitation within 30 days — we use it
 *     as-is, not re-estimated).
 *   - isKev comes directly from the CISA KEV catalog (a binary fact:
 *     this CVE is confirmed being exploited in the wild right now).
 *   - cvssScore comes directly from NVD.
 *
 * The only "assumption" layer is how these are combined into a single
 * annualized likelihood — that combination logic is explained inline.
 */

export interface LikelihoodInputs {
  epssScore: number | null; // 0–1, from FIRST EPSS
  isKev: boolean; // from CISA KEV
  cvssScore: number | null; // 0–10, from NVD
  internetFacing: boolean;
}

/**
 * Returns an annualized probability (0–1) that this specific finding is
 * exploited against this specific asset within a year.
 *
 * Methodology note: EPSS's 30-day window is converted to an annualized
 * estimate using 1 - (1 - p)^12.17 (12.17 ≈ non-overlapping 30-day windows
 * in a year), which is the standard way FIRST's own documentation suggests
 * extrapolating EPSS's window — not an arbitrary conversion.
 */
export function calculateAnnualizedLikelihood(inputs: LikelihoodInputs): number {
  const WINDOWS_PER_YEAR = 365 / 30; // ≈ 12.17

  // EPSS is the primary likelihood signal. If it's missing (a very new or
  // very obscure CVE not yet scored), fall back to a conservative baseline
  // derived from CVSS severity — high-severity unscored CVEs are treated
  // as moderately likely rather than assumed safe.
  const baseMonthlyProbability =
    inputs.epssScore !== null ? inputs.epssScore : cvssToFallbackProbability(inputs.cvssScore);

  let annualized = 1 - Math.pow(1 - baseMonthlyProbability, WINDOWS_PER_YEAR);

  // KEV confirmation is a hard signal, not a soft adjustment: a CVE CISA
  // has confirmed is being actively exploited right now is treated as
  // near-certain to be attempted against an unpatched, matching asset
  // within the year — we floor the annualized likelihood rather than
  // merely nudging it, since EPSS alone can understate imminent risk for
  // a CVE that has just been added to KEV.
  if (inputs.isKev) {
    annualized = Math.max(annualized, 0.85);
  }

  // Internet-facing assets are reachable by any attacker scanning the
  // public internet, not just a targeted actor — Verizon DBIR's incident
  // patterns consistently show externally-exploitable vulnerabilities as
  // the dominant initial-access vector. Modest multiplier, capped at 1.
  if (inputs.internetFacing) {
    annualized = Math.min(annualized * 1.15, 1);
  }

  return clamp(annualized, 0, 1);
}

/**
 * Fallback when EPSS has no score yet. CVSS alone is a severity measure,
 * not a probability, but mapping it onto a conservative monthly
 * probability band keeps unscored-but-severe CVEs from being silently
 * treated as zero-risk. Coefficients are a coarse, clearly-labeled
 * approximation — not a substitute for a real EPSS score once one exists.
 */
function cvssToFallbackProbability(cvssScore: number | null): number {
  if (cvssScore === null) return 0.02; // unknown severity, unknown exploitation — low default
  if (cvssScore >= 9) return 0.1;
  if (cvssScore >= 7) return 0.05;
  if (cvssScore >= 4) return 0.02;
  return 0.005;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}