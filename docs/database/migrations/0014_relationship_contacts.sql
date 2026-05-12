-- 0014_relationship_contacts
--
-- Phase 2.C · Institutional Relationship Graph in Supabase.
--
-- Promotes the canonical CONTACTOS DATASITE Master (4,547 contacts /
-- 2,990 companies / 2,990 activity timelines / 143 Gmail labels / 34
-- email-health rows) from the local XLSM into Postgres so the admin
-- console at /user/admin/contacts can query it.
--
-- Posture:
--   * RLS enabled on every table · ZERO policies.
--   * anon + authenticated revoked end-to-end.
--   * Only server-side service-role code (lib/admin/contacts/live.ts)
--     reads these tables. No PII ever leaves the operator-controlled
--     environment.
--
-- Already applied to project twebgqutuqgonabvhzjk on 2026-05-12 via
-- the Supabase MCP. This file is the canonical source-of-truth so a
-- fresh project can be reconstructed deterministically.

-- ── companies ────────────────────────────────────────────────────────
CREATE TABLE public.relationship_companies (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_key              text NOT NULL UNIQUE,
  name                     text NOT NULL,
  investor_type_canonical  text,
  investor_type_raw        text,
  investor_subtype         text,
  tier                     text,
  company_type             text,
  industry                 text,
  fund_size                text,
  investment_preference    text,
  investment_min           text,
  investment_max           text,
  association              text,
  description              text,
  hotel_focus              text,
  continent                text,
  location                 text,
  datasite_company_number  text,
  client_company_id        text,
  internal_notes           text,
  external_notes           text,
  company_notes            text,
  keyword                  text,
  coverage_officer         text,
  calling_lead             text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX relationship_companies_canon_idx       ON public.relationship_companies (investor_type_canonical);
CREATE INDEX relationship_companies_continent_idx   ON public.relationship_companies (continent);
CREATE INDEX relationship_companies_hotel_focus_idx ON public.relationship_companies (hotel_focus);

ALTER TABLE public.relationship_companies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.relationship_companies FROM anon, authenticated;


-- ── contacts ─────────────────────────────────────────────────────────
CREATE TABLE public.relationship_contacts (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id                       text NOT NULL UNIQUE,
  full_name                       text,
  email                           text,
  email_lower                     text DEFAULT lower(email),
  phone                           text,
  linkedin                        text,
  title                           text,
  role                            text,
  is_primary_contact              boolean NOT NULL DEFAULT false,
  company_id                      uuid REFERENCES public.relationship_companies(id) ON DELETE SET NULL,
  company_name                    text,
  investor_type                   text,
  investor_subtype                text,
  tier                            text,
  industry                        text,
  fund_size                       text,
  investment_preference           text,
  investment_min                  text,
  investment_max                  text,
  association                     text,
  hotel_focus                     text,
  geography                       text,
  city                            text,
  state                           text,
  country                         text,
  continent                       text,
  latest_deal_stage               text,
  last_activity_type              text,
  last_activity_date              date,
  buyer_added_date                date,
  pipeline_state                  text,
  ioi_bid_low                     text,
  ioi_bid_high                    text,
  loi_bid_low                     text,
  loi_bid_high                    text,
  revised_bid_low                 text,
  revised_bid_high                text,
  relationship_status             text,
  relationship_manager            text,
  coverage_officer                text,
  calling_lead                    text,
  relationship_strength           integer NOT NULL DEFAULT 0,
  active_threads                  integer NOT NULL DEFAULT 0,
  last_email_date                 date,
  inferred_relationship_stage     text,
  email_directionality            text,
  gmail_signal_source             text,
  relationship_band               text,
  collaboration_potential_score   integer NOT NULL DEFAULT 0,
  email_validity                  text,
  bounce_count                    integer NOT NULL DEFAULT 0,
  last_bounce_date                date,
  flagged_for_correction          boolean NOT NULL DEFAULT false,
  bucket                          text NOT NULL DEFAULT 'active',
  notes_consolidated              text,
  datasite_contact_number         text,
  datasite_company_number         text,
  client_contact_id               text,
  source_file                     text,
  first_seen_batch_id             text,
  last_seen_batch_id              text,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  imported_at                     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX relationship_contacts_band_idx           ON public.relationship_contacts (relationship_band);
CREATE INDEX relationship_contacts_bucket_idx         ON public.relationship_contacts (bucket);
CREATE INDEX relationship_contacts_collab_idx         ON public.relationship_contacts (collaboration_potential_score DESC);
CREATE INDEX relationship_contacts_company_idx        ON public.relationship_contacts (company_id);
CREATE INDEX relationship_contacts_company_name_idx   ON public.relationship_contacts (company_name);
CREATE INDEX relationship_contacts_email_idx          ON public.relationship_contacts (email_lower);
CREATE INDEX relationship_contacts_investor_type_idx  ON public.relationship_contacts (investor_type);

ALTER TABLE public.relationship_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.relationship_contacts FROM anon, authenticated;


-- ── interactions (one timeline per company) ──────────────────────────
CREATE TABLE public.relationship_interactions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                  uuid REFERENCES public.relationship_companies(id) ON DELETE CASCADE,
  company_name                text NOT NULL,
  datasite_activity_number    text,
  buyer_added_date            date,
  initial_contact_date        date,
  teaser_sent_date            date,
  nda_initial_sent_date       date,
  nda_signed_date             date,
  nda_executed_date           date,
  cim_sent_date               date,
  ioi_process_letter_date     date,
  ioi_bid_received_date       date,
  loi_process_letter_date     date,
  loi_bid_received_date       date,
  management_presentation_date date,
  revised_bid_received_date   date,
  declined_date               date,
  declined_reason             text,
  declined_comments           text,
  last_activity_type          text,
  last_activity_date          date,
  last_activity_comments      text,
  latest_deal_stage           text,
  pipeline_state              text,
  ioi_bid_low                 text,
  ioi_bid_high                text,
  loi_bid_low                 text,
  loi_bid_high                text,
  revised_bid_low             text,
  revised_bid_high            text,
  removed_flag                text,
  on_hold_flag                text,
  client_buyer_id             text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX relationship_interactions_company_unique     ON public.relationship_interactions (company_id);
CREATE INDEX        relationship_interactions_latest_stage_idx   ON public.relationship_interactions (latest_deal_stage);
CREATE INDEX        relationship_interactions_pipeline_idx       ON public.relationship_interactions (pipeline_state);

ALTER TABLE public.relationship_interactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.relationship_interactions FROM anon, authenticated;


-- ── labels (Gmail label edges per contact) ───────────────────────────
CREATE TABLE public.relationship_labels (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      uuid NOT NULL REFERENCES public.relationship_contacts(id) ON DELETE CASCADE,
  label           text NOT NULL,
  inferred_stage  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id, label)
);

CREATE INDEX relationship_labels_contact_idx ON public.relationship_labels (contact_id);
CREATE INDEX relationship_labels_label_idx   ON public.relationship_labels (label);
CREATE INDEX relationship_labels_stage_idx   ON public.relationship_labels (inferred_stage);

ALTER TABLE public.relationship_labels ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.relationship_labels FROM anon, authenticated;


-- ── health (per-contact bounce + validity) ───────────────────────────
CREATE TABLE public.relationship_health (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id                  uuid NOT NULL UNIQUE REFERENCES public.relationship_contacts(id) ON DELETE CASCADE,
  email_validity              text NOT NULL DEFAULT 'uncertain',
  bounce_count                integer NOT NULL DEFAULT 0,
  last_bounce_date            date,
  bounce_reasons              jsonb,
  flagged_for_correction      boolean NOT NULL DEFAULT false,
  suggested_replacement_email text,
  inferred_correct_company    text,
  last_health_check_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX relationship_health_flagged_idx  ON public.relationship_health (flagged_for_correction);
CREATE INDEX relationship_health_validity_idx ON public.relationship_health (email_validity);

ALTER TABLE public.relationship_health ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.relationship_health FROM anon, authenticated;
