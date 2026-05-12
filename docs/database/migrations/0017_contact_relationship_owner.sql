-- 0017_contact_relationship_owner
--
-- Phase 2.D.2 · Operator assigns a relationship owner directly on the
-- CONTACT (not the converted user). Lets the funnel carry ownership
-- end-to-end — the owner is set when the contact is qualified, not
-- only after it converts into a user.
--
-- Note: a `relationship_owner_email` column also exists on
-- `public.users` (added in 0015). The two are deliberately distinct:
--   * `relationship_contacts.relationship_owner_email` = owner of the
--     contact during the activation funnel.
--   * `users.relationship_owner_email` = owner of the user after
--     onboarding (typically copied forward by the invitation flow).

ALTER TABLE public.relationship_contacts
  ADD COLUMN relationship_owner_email text;

CREATE INDEX relationship_contacts_owner_idx
  ON public.relationship_contacts (relationship_owner_email);
