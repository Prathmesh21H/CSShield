/**
 * Seeds compliance framework reference data via the Supabase JS client,
 * as a JS-native alternative to running supabase/migrations/0002_seed_frameworks.sql
 * directly. Useful when you want to (re-)seed an already-provisioned
 * Supabase project without going through the SQL editor or CLI migration
 * runner — e.g. from a CI step or a teammate's machine that only has
 * Node set up.
 *
 * IMPORTANT: the data below must stay identical to
 * supabase/migrations/0002_seed_frameworks.sql — that SQL file is the
 * source of truth for a fresh database; this script is a convenience
 * path for re-seeding, not a replacement. If you add a framework or
 * control here, add it there too.
 *
 * Run with: npm run seed:frameworks
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../lib/utils/logger";

const log = logger("seedFrameworkData");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local — cannot seed."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const FRAMEWORKS = [
  { name: "NIST CSF", version: "2.0" },
  { name: "CIS Controls", version: "v8" },
  { name: "ISO 27001", version: "2022" },
  { name: "RBI CSF", version: "2016" },
  { name: "SEBI CSCRF", version: "2024" },
] as const;

// Kept in sync with 0002_seed_frameworks.sql — see the file header note.
const FRAMEWORK_CONTROLS: Record<string, Array<{ ref: string; title: string }>> = {
  "NIST CSF": [
    { ref: "ID.AM-1", title: "Physical devices and systems are inventoried" },
    { ref: "ID.RA-1", title: "Asset vulnerabilities are identified and documented" },
    { ref: "PR.AC-1", title: "Identities and credentials are managed" },
    { ref: "PR.IP-12", title: "A vulnerability management plan is developed and implemented" },
    { ref: "DE.CM-8", title: "Vulnerability scans are performed" },
    {
      ref: "RS.MI-3",
      title: "Newly identified vulnerabilities are mitigated or documented as accepted risk",
    },
  ],
  "CIS Controls": [
    { ref: "CIS-1", title: "Inventory and Control of Enterprise Assets" },
    { ref: "CIS-4", title: "Secure Configuration of Enterprise Assets and Software" },
    { ref: "CIS-7", title: "Continuous Vulnerability Management" },
    { ref: "CIS-12", title: "Network Infrastructure Management" },
    { ref: "CIS-16", title: "Application Software Security" },
  ],
  "ISO 27001": [
    { ref: "A.5.7", title: "Threat intelligence" },
    { ref: "A.8.8", title: "Management of technical vulnerabilities" },
    { ref: "A.8.9", title: "Configuration management" },
    { ref: "A.5.23", title: "Information security for use of cloud services" },
    { ref: "A.8.16", title: "Monitoring activities" },
  ],
  "RBI CSF": [
    { ref: "RBI-2.1", title: "Inventory management of business IT assets" },
    { ref: "RBI-2.4", title: "Vulnerability assessment and penetration testing" },
    { ref: "RBI-2.6", title: "Patch/vulnerability & change management" },
    { ref: "RBI-4", title: "Cyber Crisis Management Plan" },
  ],
  "SEBI CSCRF": [
    { ref: "SEBI-VAPT", title: "Vulnerability Assessment and Penetration Testing" },
    { ref: "SEBI-NET", title: "Network security and segmentation" },
    { ref: "SEBI-IR", title: "Incident response and reporting" },
    { ref: "SEBI-DR", title: "Business continuity and disaster recovery" },
  ],
};

async function main() {
  log.info("Seeding frameworks...");

  const { data: frameworks, error: frameworkError } = await supabase
    .from("frameworks")
    .upsert(FRAMEWORKS.map((f) => ({ name: f.name, version: f.version })), { onConflict: "name" })
    .select("id, name");

  if (frameworkError) {
    log.error("Failed to seed frameworks", { error: frameworkError.message });
    process.exit(1);
  }

  const frameworkIdByName = new Map((frameworks ?? []).map((f) => [f.name, f.id]));

  let totalControls = 0;
  for (const [frameworkName, controls] of Object.entries(FRAMEWORK_CONTROLS)) {
    const frameworkId = frameworkIdByName.get(frameworkName);
    if (!frameworkId) {
      log.warn(`Framework not found after upsert, skipping controls`, { frameworkName });
      continue;
    }

    const { error: controlsError } = await supabase.from("framework_controls").upsert(
      controls.map((c) => ({
        framework_id: frameworkId,
        control_ref: c.ref,
        control_title: c.title,
      })),
      { onConflict: "framework_id,control_ref" }
    );

    if (controlsError) {
      log.error(`Failed to seed controls for ${frameworkName}`, { error: controlsError.message });
      process.exit(1);
    }

    totalControls += controls.length;
    log.info(`Seeded ${controls.length} controls for ${frameworkName}`);
  }

  log.info("Framework seed complete", {
    frameworksSeeded: frameworks?.length ?? 0,
    controlsSeeded: totalControls,
  });
}

main().catch((err) => {
  log.error("Unhandled error during seeding", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});