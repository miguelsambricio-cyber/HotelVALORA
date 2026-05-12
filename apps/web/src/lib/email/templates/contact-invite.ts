/**
 * Contact-invite email template — surfaced by the bulk-invite action on
 * /user/admin/contacts. Institutional tone, no marketing copy. The
 * invite carries a stable token (the invitation_id) so the landing
 * route can resolve which contact + which campaign accepted.
 *
 * Returns both `html` and `text` for proper multipart delivery.
 */

export interface ContactInviteInput {
  contactName: string | null;
  /** Where the recipient lands when they click "Accept invitation" */
  acceptUrl: string;
  /** Optional campaign name shown in the byline */
  campaignName?: string | null;
  /** Optional promo code surfaced as a short ribbon */
  promoCode?: string | null;
  /** Optional tier hint ("Pro · Premium · Top Promote · Comped") */
  tier?: string | null;
  /** Operator email signing the invitation (RESEND_FROM_EMAIL display) */
  signedBy?: string | null;
}

export interface ContactInviteEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderContactInvite(input: ContactInviteInput): ContactInviteEmail {
  const greeting = input.contactName?.trim()
    ? `Hello ${input.contactName.trim().split(/\s+/)[0]},`
    : "Hello,";

  const tierLine = input.tier
    ? `Tier on acceptance: <strong>${escapeHtml(formatTier(input.tier))}</strong>`
    : null;

  const promoLine = input.promoCode
    ? `Promo code: <code style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#f2f5f3;padding:2px 6px;border-radius:4px;">${escapeHtml(input.promoCode)}</code>`
    : null;

  const campaignLine = input.campaignName
    ? `Campaign: ${escapeHtml(input.campaignName)}`
    : null;

  const subject = "Your HOTELVALORA invitation";

  const html = /* html */ `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0; padding:0; background:#f6f8f7; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; color:#0f1f1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8f7; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden;">
          <tr>
            <td style="background:#0f1f1a; padding:20px 28px;">
              <div style="font-size:11px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:#bef264;">HOTELVALORA</div>
              <div style="font-size:11px; color:#cbd5e1; margin-top:2px;">Institutional hospitality investment intelligence</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 12px; font-size:15px;">${escapeHtml(greeting)}</p>
              <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#334155;">
                You have been invited to join HOTELVALORA, an institutional platform for hospitality
                investment intelligence, underwriting and the operator network.
              </p>
              <p style="margin:0 0 20px; font-size:14px; line-height:1.6; color:#334155;">
                Use the button below to activate your account.
              </p>
              <p style="margin:0 0 24px;">
                <a href="${input.acceptUrl}"
                   style="display:inline-block; background:#0f1f1a; color:#bef264; text-decoration:none;
                          padding:12px 22px; border-radius:10px; font-size:13px; font-weight:700;
                          letter-spacing:0.16em; text-transform:uppercase;">
                  Accept invitation
                </a>
              </p>
              ${tierLine ? `<p style="margin:0 0 4px; font-size:12.5px; color:#475569;">${tierLine}</p>` : ""}
              ${promoLine ? `<p style="margin:0 0 4px; font-size:12.5px; color:#475569;">${promoLine}</p>` : ""}
              ${campaignLine ? `<p style="margin:0 0 4px; font-size:12.5px; color:#475569;">${campaignLine}</p>` : ""}
              <p style="margin:24px 0 0; font-size:11.5px; color:#94a3b8; line-height:1.6;">
                If this invitation was sent to the wrong address, you can safely ignore this message.
                ${input.signedBy ? `Signed by ${escapeHtml(input.signedBy)}.` : ""}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f2f5f3; padding:14px 28px; border-top:1px solid #e5e7eb; color:#94a3b8; font-size:10.5px;">
              HOTELVALORA · institutional hospitality investment intelligence · hotelvalora.com
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    greeting,
    "",
    "You have been invited to join HOTELVALORA — an institutional platform for hospitality investment intelligence, underwriting and the operator network.",
    "",
    `Accept invitation: ${input.acceptUrl}`,
    "",
    ...(input.tier ? [`Tier on acceptance: ${formatTier(input.tier)}`] : []),
    ...(input.promoCode ? [`Promo code: ${input.promoCode}`] : []),
    ...(input.campaignName ? [`Campaign: ${input.campaignName}`] : []),
    "",
    "If this invitation was sent to the wrong address, you can safely ignore this message.",
    ...(input.signedBy ? [`Signed by ${input.signedBy}.`] : []),
    "",
    "HOTELVALORA · institutional hospitality investment intelligence · hotelvalora.com",
  ].join("\n");

  return { subject, html, text };
}

function formatTier(tier: string): string {
  switch (tier) {
    case "free": return "Free";
    case "pro": return "Pro";
    case "premium": return "Premium";
    case "team": return "Team";
    case "enterprise": return "Enterprise";
    case "top_promote": return "Top Promote";
    case "comped": return "Comped";
    default: return tier;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
