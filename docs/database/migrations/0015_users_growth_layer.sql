-- 0015_users_growth_layer
--
-- Phase 2.D.1 · Operational growth layer.
--
-- Wires the canonical relation: contact → invited → onboarded user
-- → active subscriber → premium/top-promote client. Builds the
-- foundation for `/user/admin/users`, `/user/admin/campaigns`, and
-- `/user/admin/subscriptions` — the three operational surfaces that
-- turn the contacts base into a growth engine for HOTELVALORA.
--
-- Posture:
--   * New tables RLS-enabled with zero policies · anon + authenticated
--     revoked · only server-side service-role code reads them.
--   * Bidirectional contact↔user FK so both surfaces can resolve the
--     other in a single roundtrip.
--   * All status fields use CHECK constraints over text rather than
--     Postgres enums, so adding a state later is a no-op migration.
--
-- Already applied to project twebgqutuqgonabvhzjk on 2026-05-12 via
-- the Supabase MCP. This file is the canonical source-of-truth.

-- 1) Extend public.users with operational growth fields
ALTER TABLE public.users
  ADD COLUMN full_name                text,
  ADD COLUMN last_seen_at             timestamptz,
  ADD COLUMN invitation_status        text NOT NULL DEFAULT 'active',
  ADD COLUMN promo_code               text,
  ADD COLUMN relationship_owner_email text,
  ADD COLUMN linked_contact_id        uuid REFERENCES public.relationship_contacts(id) ON DELETE SET NULL,
  ADD CONSTRAINT users_invitation_status_check
    CHECK (invitation_status IN ('invited','onboarding','active','inactive','churn_risk'));

CREATE INDEX users_invitation_status_idx ON public.users (invitation_status);
CREATE INDEX users_linked_contact_idx    ON public.users (linked_contact_id);
CREATE INDEX users_last_seen_idx         ON public.users (last_seen_at DESC NULLS LAST);

-- 2) Extend public.relationship_contacts with reverse FK + growth fields
ALTER TABLE public.relationship_contacts
  ADD COLUMN linked_user_id            uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN contact_invitation_status text NOT NULL DEFAULT 'not_invited',
  ADD COLUMN last_contacted_at         timestamptz,
  ADD CONSTRAINT relationship_contacts_invite_status_check
    CHECK (contact_invitation_status IN ('not_invited','invited','onboarding','converted','declined','bounced'));

CREATE INDEX relationship_contacts_invite_status_idx ON public.relationship_contacts (contact_invitation_status);
CREATE INDEX relationship_contacts_linked_user_idx   ON public.relationship_contacts (linked_user_id);

-- 3) campaigns · activation surface (one row per campaign)
CREATE TABLE public.campaigns (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  kind        text NOT NULL,
  status      text NOT NULL DEFAULT 'draft',
  owner_email text,
  description text,
  channel     text NOT NULL DEFAULT 'email',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaigns_status_check
    CHECK (status IN ('draft','running','paused','completed','archived')),
  CONSTRAINT campaigns_kind_check
    CHECK (kind IN ('investor_outreach','operator_onboarding','beta_invite',
                    'top_promote_rollout','lender_campaign','newsletter',
                    'partnership','custom'))
);

CREATE INDEX campaigns_status_idx ON public.campaigns (status);
CREATE INDEX campaigns_kind_idx   ON public.campaigns (kind);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.campaigns FROM anon, authenticated;

-- 4) contact_invitations · per-contact activation event log
--    One row PER outbound send (a contact can be invited multiple
--    times across multiple campaigns). The latest row drives the
--    `relationship_contacts.contact_invitation_status` rollup.
CREATE TABLE public.contact_invitations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id         uuid NOT NULL REFERENCES public.relationship_contacts(id) ON DELETE CASCADE,
  campaign_id        uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  invited_by_email   text,
  invited_email      text NOT NULL,
  promo_code         text,
  status             text NOT NULL DEFAULT 'pending',
  sent_at            timestamptz,
  responded_at       timestamptz,
  resend_message_id  text,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contact_invitations_status_check
    CHECK (status IN ('pending','sent','delivered','opened','clicked',
                      'bounced','accepted','declined','converted'))
);

CREATE INDEX contact_invitations_contact_idx  ON public.contact_invitations (contact_id);
CREATE INDEX contact_invitations_campaign_idx ON public.contact_invitations (campaign_id);
CREATE INDEX contact_invitations_status_idx   ON public.contact_invitations (status);

ALTER TABLE public.contact_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contact_invitations FROM anon, authenticated;
