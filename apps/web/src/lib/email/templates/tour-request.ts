/**
 * Tour-request email template — surfaced from the Library contact-card
 * "Schedule a Tour" CTA on top-promoted reports.
 *
 * Returns both `html` and `text` bodies so Resend delivers a multipart
 * MIME message — better deliverability and accessibility than HTML
 * alone. The shape is intentionally institutional: forest header, mono
 * reference code, no marketing copy.
 */

export interface TourRequestInput {
  /** Account manager / listing owner — recipient */
  accountManagerName: string;
  /** Hotel headline ("The Ritz-Carlton Madrid") */
  hotelName: string;
  /** Free-form classification ("5* Gran Lujo") */
  classification: string;
  rooms: number;
  city: string;
  /** Reference code (HV-YYYY-NNN) — uniquely identifies the report */
  referenceCode: string;
  /** Requester contact line — name + email of whoever clicked the CTA */
  requesterName?: string;
  requesterEmail?: string;
}

export interface TourRequestEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderTourRequest(input: TourRequestInput): TourRequestEmail {
  const subject = `Tour request — ${input.hotelName} (${input.referenceCode})`;

  const requester = input.requesterEmail
    ? `${input.requesterName ?? "Anonymous"} <${input.requesterEmail}>`
    : "Anonymous visitor (no contact provided)";

  const html = /* html */ `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f6f8f7;font-family:Inter,-apple-system,Segoe UI,sans-serif;color:#191c1d;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f8f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;box-shadow:0 20px 40px rgba(0,51,30,0.06);overflow:hidden;">
            <tr>
              <td style="background:#062C1C;padding:24px 28px;">
                <div style="font-family:Manrope,Inter,sans-serif;color:#bef264;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:6px;">
                  HotelVALORA · Institutional Grade
                </div>
                <div style="font-family:Manrope,Inter,sans-serif;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.01em;">
                  Tour request — ${escape(input.hotelName)}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-size:14px;line-height:1.55;color:#334155;">
                <p style="margin:0 0 16px 0;">Hi <strong>${escape(input.accountManagerName)}</strong>,</p>
                <p style="margin:0 0 20px 0;">
                  An institutional user has requested a tour of
                  <strong>${escape(input.hotelName)}</strong>
                  through the HotelVALORA Library.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f5;border-radius:8px;margin:0 0 20px 0;">
                  <tr>
                    <td style="padding:14px 18px;font-size:12px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="color:#64748b;text-transform:uppercase;letter-spacing:0.12em;font-size:10px;font-weight:700;padding-bottom:4px;">Reference</td>
                          <td style="color:#64748b;text-transform:uppercase;letter-spacing:0.12em;font-size:10px;font-weight:700;padding-bottom:4px;">Asset</td>
                        </tr>
                        <tr>
                          <td style="color:#062C1C;font-family:'SFMono-Regular',Consolas,monospace;font-size:13px;padding-bottom:10px;">${escape(input.referenceCode)}</td>
                          <td style="color:#062C1C;font-size:13px;font-weight:600;padding-bottom:10px;">${escape(input.classification)} · ${input.rooms} rooms · ${escape(input.city)}</td>
                        </tr>
                        <tr>
                          <td colspan="2" style="color:#64748b;text-transform:uppercase;letter-spacing:0.12em;font-size:10px;font-weight:700;padding-bottom:4px;">Requested by</td>
                        </tr>
                        <tr>
                          <td colspan="2" style="color:#062C1C;font-size:13px;font-weight:500;">${escape(requester)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 16px 0;color:#475569;">
                  This message was sent automatically from the report
                  page. Reply to it to coordinate directly with the
                  requester.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#191c1d;padding:14px 28px;color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:0.18em;">
                © HotelVALORA Institutional · Underwriting-grade intelligence
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `HotelVALORA — Tour Request`,
    ``,
    `Hi ${input.accountManagerName},`,
    ``,
    `An institutional user has requested a tour of "${input.hotelName}" through the HotelVALORA Library.`,
    ``,
    `Reference: ${input.referenceCode}`,
    `Asset:     ${input.classification} · ${input.rooms} rooms · ${input.city}`,
    `Requested: ${requester}`,
    ``,
    `Reply to this email to coordinate directly with the requester.`,
    ``,
    `— HotelVALORA Institutional`,
  ].join("\n");

  return { subject, html, text };
}

// ── Minimal HTML escape — keeps interpolated user data safe ────────────────
function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
