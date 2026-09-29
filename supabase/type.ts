/**
 * Hand-authored equivalent of Supabase's generated types, matching the
 * schema in supabase/migrations/0001_init_schema.sql. Regenerate with
 * `supabase gen types typescript` once the schema is finalized and keep
 * this file in sync, or replace it with the generated output directly.
 */
export interface Database {
  public: {
    Tables: {
      business_units: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name: string; created_at?: string };
        Update: { id?: string; name?: string; created_at?: string };
      };
      assets: {
        Row: {
          id: string;
          name: string;
          business_unit_id: string;
          criticality: "low" | "medium" | "high" | "critical";
          internet_facing: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          business_unit_id: string;
          criticality: "low" | "medium" | "high" | "critical";
          internet_facing?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["assets"]["Insert"]>;
      };
      findings: {
        Row: {
          id: string;
          asset_id: string;
          cve_id: string;
          cvss_score: number | null;
          epss_score: number | null;
          is_kev: boolean;
          cwe_id: string | null;
          status: "open" | "patched" | "accepted_risk";
          discovered_at: string;
        };
        Insert: {
          id?: string;
          asset_id: string;
          cve_id: string;
          cvss_score?: number | null;
          epss_score?: number | null;
          is_kev?: boolean;
          cwe_id?: string | null;
          status?: "open" | "patched" | "accepted_risk";
          discovered_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["findings"]["Insert"]>;
      };
      controls: {
        Row: {
          id: string;
          name: string;
          cost: number;
          est_risk_reduction_pct: number;
          framework_refs: Record<string, string[]> | null;
        };
        Insert: {
          id?: string;
          name: string;
          cost: number;
          est_risk_reduction_pct: number;
          framework_refs?: Record<string, string[]> | null;
        };
        Update: Partial<Database["public"]["Tables"]["controls"]["Insert"]>;
      };
      risk_scores: {
        Row: {
          id: string;
          scope_type: "org" | "business_unit" | "asset";
          scope_id: string | null;
          eal_value: number;
          var95_value: number;
          computed_at: string;
        };
        Insert: {
          id?: string;
          scope_type: "org" | "business_unit" | "asset";
          scope_id?: string | null;
          eal_value: number;
          var95_value: number;
          computed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["risk_scores"]["Insert"]>;
      };
      frameworks: {
        Row: { id: string; name: string; version: string | null };
        Insert: { id?: string; name: string; version?: string | null };
        Update: Partial<Database["public"]["Tables"]["frameworks"]["Insert"]>;
      };
      ingestion_log: {
        Row: {
          id: string;
          source: "nvd" | "epss" | "kev" | "synthetic";
          record_count: number;
          status: "success" | "partial" | "failed";
          ran_at: string;
        };
        Insert: {
          id?: string;
          source: "nvd" | "epss" | "kev" | "synthetic";
          record_count: number;
          status: "success" | "partial" | "failed";
          ran_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ingestion_log"]["Insert"]>;
      };
    };
  };
}