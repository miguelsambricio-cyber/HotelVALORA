# Integrations · Resend

Resend powers all transactional email out of HotelVALORA. The integration runs **server-only** — `RESEND_API_KEY` never leaves the Vercel function runtime.

## What's wired today

| Surface | File | Trigger |
|---|---|---|
| Library "Schedule a Tour" CTA (top-promoted reports) | `components/library/contact-cell.tsx` + `lib/email/actions.ts` `sendTourRequestAction` | Click on the popover button — sends a tour request to the report's account manager |

## Architecture

```
ContactCell (client component)
       │  click
       ▼
sendTourRequestAction (server action — "use server")
       │  zod validates payload
       ▼
getResend() → Resend SDK
       │
       ▼
Resend API   →  account-manager@…
       │
       └─ tagged: { kind: "tour-request", reference: <REF> }
```

## Files

- `apps/web/src/lib/email/client.ts` — singleton Resend client + `getDefaultFromAddress()`. `import "server-only"` guard.
- `apps/web/src/lib/email/templates/tour-request.ts` — typed template returning `{ subject, html, text }`. HTML uses forest-900 header + slate body. Text body for accessibility and deliverability.
- `apps/web/src/lib/email/actions.ts` — server actions. Today: `sendTourRequestAction(payload)`. Zod-validates the payload, throws → returns `{ ok: false, error }` for any failure.

## Environment

| Variable | Required | Notes |
|---|---|---|
| `RESEND_API_KEY` | yes | Server-only. Get from https://resend.com/api-keys |
| `RESEND_FROM_EMAIL` | optional | Defaults to `HotelVALORA <onboarding@resend.dev>` (Resend sandbox) |

### Sandbox vs production

- **Sandbox** (`onboarding@resend.dev`): only delivers to the Resend account owner's verified email. Use for local dev — every other recipient bounces.
- **Production** (current state since 2026-05-11): `hotelvalora.com` verified in Resend (DKIM + SPF in Namecheap DNS) → `RESEND_FROM_EMAIL=HotelVALORA <noreply@hotelvalora.com>` on Vercel. Delivers to any recipient.

To re-do the activation from scratch (eg. after rotating the API key):

```bash
# 1. Verify the domain at https://resend.com/domains (add DKIM/SPF records
#    at your DNS registrar). hotelvalora.com is already verified as of
#    2026-05-11 — skip this step unless re-creating the Resend account.
# 2. Update the env vars on Vercel:
vercel env rm RESEND_API_KEY production --yes
vercel env add RESEND_API_KEY production  # paste re_…
vercel env rm RESEND_FROM_EMAIL production --yes
echo "HotelVALORA <noreply@hotelvalora.com>" | vercel env add RESEND_FROM_EMAIL production
# 3. Trigger a deploy (auto via git push, or `vercel deploy --prod --yes`).
```

## Reply-to behaviour

`sendTourRequestAction` sets `replyTo` to the requester's email when provided — the account manager's "Reply" button in their mail client lands directly with the requester, not with HotelVALORA. When the requester email is absent (anonymous tour click), `replyTo` is omitted and replies bounce to `RESEND_FROM_EMAIL`.

## Tags

Every send is tagged for the Resend analytics dashboard:

| Tag | Value |
|---|---|
| `kind` | `tour-request` (always) |
| `reference` | The report's `referenceCode` (sanitised — non-alphanumerics → `_`) |

## Future integrations

| Surface | Status |
|---|---|
| Auth.js magic-link sign-in | Needs DB adapter (Phase 3) — Auth.js `Email` provider stores verification tokens in the adapter |
| Top Promote expiration warnings (7d / 1d before `promotedUntil`) | Phase 5 — cron job + `sendPromotionExpiringSoon` |
| Saved-scenario change notifications | Phase 5 |
| Welcome email after first OAuth sign-in | Wire from `auth.config.ts` `events.signIn` callback |

## Cross-references

| Topic | Doc |
|---|---|
| Library feature | `docs/features/library.md` |
| Contact card mechanics | `docs/data-models/library-models.md` |
| Auth.js | `docs/data-models/user-models.md` |
