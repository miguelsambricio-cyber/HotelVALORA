-- 0016_contacts_operator_tags_and_softdelete
--
-- Phase 2.D.2 · Operator-editable mutations on relationship_contacts.
-- Adds the columns needed by the contact mutation server actions
-- (edit · mark invalid · add tag · remove tag · assign owner ·
-- update status). PRIMERA OLA — does NOT expose deletion, but the
-- soft-delete column lands now so the mutation layer can assume the
-- "active row" invariant from day one.
--
--   * tags        text[]      — operator-added tags (distinct from
--                                Gmail-derived `relationship_labels`).
--                                GIN-indexed for fast set queries.
--   * deleted_at  timestamptz — soft-delete column. NULL = active.
--                                Partial index serves the active-row
--                                lookup. SEGUNDA OLA exposes the
--                                delete action; until then this column
--                                stays unwritten in production.
--
-- Audit trail lives in the existing `public.activity_log`. Mutation
-- server actions write one row per change with:
--   entity_type = 'relationship_contact'
--   action      ∈ { contact.updated, contact.invalid_marked,
--                   contact.tag_added, contact.tag_removed,
--                   contact.owner_assigned, contact.status_updated,
--                   contact.deleted (Phase 2.D.2b) }
--   metadata    { before · after · diff (jsonb) }
--
-- Already applied to project twebgqutuqgonabvhzjk on 2026-05-12 via MCP.

ALTER TABLE public.relationship_contacts
  ADD COLUMN tags       text[] NOT NULL DEFAULT '{}',
  ADD COLUMN deleted_at timestamptz;

CREATE INDEX relationship_contacts_tags_gin_idx
  ON public.relationship_contacts USING GIN (tags);

CREATE INDEX relationship_contacts_active_idx
  ON public.relationship_contacts (id)
  WHERE deleted_at IS NULL;
