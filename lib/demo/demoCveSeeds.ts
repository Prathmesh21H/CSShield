/**
 * A small, hand-curated set of REAL, publicly documented CVEs — used so
 * the application has something to compute risk from immediately,
 * without requiring a working NVD_API_KEY / live network access first.
 *
 * Per the build prompt's realism rule, this is the one deliberate,
 * clearly-labeled exception: these are genuine CVE IDs with their real,
 * publicly reported CVSS base scores and KEV status (all of these are
 * well-known, heavily documented vulnerabilities — Log4Shell, the
 * MOVEit/ProxyShell family, etc.). EPSS scores are NOT live — EPSS
 * changes daily, so a hardcoded EPSS number here would go stale
 * immediately. Instead, epssScore is left null for every demo record,
 * which correctly triggers the risk engine's CVSS-based fallback
 * likelihood (see lib/risk-engine/likelihood.ts) rather than pretending
 * to know a live probability we don't have.
 *
 * Running real ingestion (POST /api/ingest/nvd, /epss, /kev) at any point
 * will overwrite/enrich these same cve_id rows with live data — this seed
 * is a bootstrap, not a permanent substitute.
 */

export interface DemoCveSeed {
  cveId: string;
  cvssScore: number;
  cweId: string | null;
  isKev: boolean; // per the real, public CISA KEV catalog at time of writing
  description: string;
}

export const DEMO_CVE_SEED: DemoCveSeed[] = [
  {
    cveId: "CVE-2021-44228",
    cvssScore: 10.0,
    cweId: "CWE-502",
    isKev: true,
    description: "Apache Log4j2 JNDI lookup remote code execution (\"Log4Shell\").",
  },
  {
    cveId: "CVE-2021-34527",
    cvssScore: 8.8,
    cweId: "CWE-269",
    isKev: true,
    description: "Windows Print Spooler remote code execution (\"PrintNightmare\").",
  },
  {
    cveId: "CVE-2023-34362",
    cvssScore: 9.8,
    cweId: "CWE-89",
    isKev: true,
    description: "Progress MOVEit Transfer SQL injection leading to remote code execution.",
  },
  {
    cveId: "CVE-2021-26855",
    cvssScore: 9.8,
    cweId: "CWE-918",
    isKev: true,
    description: "Microsoft Exchange Server SSRF (\"ProxyLogon\" chain, first stage).",
  },
  {
    cveId: "CVE-2022-22965",
    cvssScore: 9.8,
    cweId: "CWE-94",
    isKev: true,
    description: "Spring Framework remote code execution via data binding (\"Spring4Shell\").",
  },
  {
    cveId: "CVE-2020-1472",
    cvssScore: 10.0,
    cweId: "CWE-330",
    isKev: true,
    description: "Netlogon elevation of privilege (\"Zerologon\").",
  },
  {
    cveId: "CVE-2019-19781",
    cvssScore: 9.8,
    cweId: "CWE-22",
    isKev: true,
    description: "Citrix ADC and Gateway directory traversal leading to RCE.",
  },
  {
    cveId: "CVE-2017-5638",
    cvssScore: 10.0,
    cweId: "CWE-20",
    isKev: true,
    description: "Apache Struts 2 Jakarta Multipart parser RCE (used in the Equifax breach).",
  },
  {
    cveId: "CVE-2014-0160",
    cvssScore: 7.5,
    cweId: "CWE-125",
    isKev: false,
    description: "OpenSSL heartbeat out-of-bounds read (\"Heartbleed\").",
  },
  {
    cveId: "CVE-2017-0144",
    cvssScore: 8.1,
    cweId: "CWE-20",
    isKev: true,
    description: "Windows SMBv1 remote code execution (\"EternalBlue\", used by WannaCry).",
  },
  {
    cveId: "CVE-2023-23397",
    cvssScore: 9.8,
    cweId: "CWE-294",
    isKev: true,
    description: "Microsoft Outlook elevation of privilege via crafted reminder task.",
  },
  {
    cveId: "CVE-2022-26134",
    cvssScore: 9.8,
    cweId: "CWE-94",
    isKev: true,
    description: "Atlassian Confluence OGNL injection leading to RCE.",
  },
  {
    cveId: "CVE-2021-21972",
    cvssScore: 9.8,
    cweId: "CWE-22",
    isKev: false,
    description: "VMware vCenter Server unauthenticated RCE via file upload plugin.",
  },
  {
    cveId: "CVE-2019-11510",
    cvssScore: 10.0,
    cweId: "CWE-22",
    isKev: true,
    description: "Pulse Connect Secure arbitrary file read leading to credential theft.",
  },
  {
    cveId: "CVE-2018-13379",
    cvssScore: 9.8,
    cweId: "CWE-22",
    isKev: true,
    description: "Fortinet FortiOS SSL VPN path traversal credential disclosure.",
  },
  {
    cveId: "CVE-2022-30190",
    cvssScore: 7.8,
    cweId: "CWE-20",
    isKev: true,
    description: "Microsoft Support Diagnostic Tool RCE via crafted Office document (\"Follina\").",
  },
  {
    cveId: "CVE-2023-4863",
    cvssScore: 8.8,
    cweId: "CWE-787",
    isKev: true,
    description: "WebP image format heap buffer overflow affecting Chrome and other consumers.",
  },
  {
    cveId: "CVE-2021-3156",
    cvssScore: 7.8,
    cweId: "CWE-787",
    isKev: false,
    description: "Sudo heap-based buffer overflow (\"Baron Samedit\") allowing local privilege escalation.",
  },
  {
    cveId: "CVE-2016-5195",
    cvssScore: 7.8,
    cweId: "CWE-362",
    isKev: true,
    description: "Linux kernel copy-on-write race condition privilege escalation (\"Dirty COW\").",
  },
  {
    cveId: "CVE-2023-38831",
    cvssScore: 7.8,
    cweId: "CWE-59",
    isKev: true,
    description: "WinRAR file extension spoofing leading to arbitrary code execution.",
  },
];