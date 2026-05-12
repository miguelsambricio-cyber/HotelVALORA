-- 0020_invitation_accept_flow
--
-- Phase 2.D.5 · Closes the acquisition funnel. Adds the fields needed
-- to track invitation lifecycle through acceptance, conversion,
-- revocation, and natural expiration.
--
-- The /invite/<token> landing route + the `acceptInvitationAction`
-- read/write these columns:
--   * accepted_at         — stamped on the accept action
--   * converted_at        — stamped when the subscription bootstraps
--   * accepted_by_user_id — FK to the resolved auth user
--   * expires_at          — defaults to now() + 30 days at insert time
--
-- Status CHECK extended from 9 states to 11 to cover revoke + natural
-- expiration on top of the prior set.
--
-- Already applied to project twebgqutuqgonabvhzjk on 2026-05-13 via MCP.

ALTER TABLE public.contact_invitations
  ADD COLUMN accepted_at         timestamptz,
  ADD COLUMN converted_at        timestamptz,
  ADD COLUMN accepted_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN expires_at          timestamptz DEFAULT (now() + interval '30 days');

ALTER TABLE public.contact_invitations
  DROP CONSTRAINT contact_invitations_status_check;

ALTER TABLE public.contact_invitations
  ADD CONSTRAINT contact_invitations_status_check
  CHECK (status IN ('pending','sent','delivered','opened','clicked',
                    'bounced','accepted','declined','converted',
                    'revoked','expired'));

CREATE INDEX contact_invitations_expires_idx
  ON public.contact_invitations (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX contact_invitations_accepted_by_idx
  ON public.contact_invitations (accepted_by_user_id);

-- Audit verbs flowing through this surface (writes go to
-- public.activity_log with entity_type='contact_invitation'):
--   invitation.opened            first /invite/<token> visit
--   invitation.accepted          accept action succeeded
--   invitation.converted         subscription bootstrap completed
--   invitation.revoked           operator cancel (Phase 2.D.5b)
--   invitation.expired           natural-end cleanup (Phase 2.D.5b cron)
