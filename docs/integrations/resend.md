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
- **Production**: verify a domain in the Resend dashboard, then set `RESEND_FROM_EMAIL=HotelVALORA <noreply@hotelvalora.com>`. Resend will deliver to any recipient.

To activate production delivery:

```bash
# Verify the domain (DKIM / SPF records added in DNS):
#   https://resend.com/domains
vercel env add RESEND_API_KEY production
vercel env add RESEND_FROM_EMAIL production
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
