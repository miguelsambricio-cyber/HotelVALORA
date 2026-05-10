"use server";

import { z } from "zod";
import { getDefaultFromAddress, getResend } from "./client";
import { renderTourRequest, type TourRequestInput } from "./templates/tour-request";

/**
 * Server actions for transactional email.
 *
 * Why server actions, not API routes:
 *   - Type-safe contract from client → server (just call the function)
 *   - No URL surface to maintain
 *   - Server-only env vars (RESEND_API_KEY) stay server-only
 *
 * Caller pattern (client component):
 *
 *   const result = await sendTourRequestAction({ reportId, ... });
 *   if (!result.ok) toast.error(result.error);
 *
 * Today, the recipient address comes from the contact info on each
 * report. When Resend's sandbox sender (`onboarding@resend.dev`) is
 * in use, ONLY the Resend account owner's email receives the message;
 * verified-domain senders deliver to anyone.
 */

const TourRequestSchema = z.object({
  accountManagerName: z.string().min(1).max(120),
  accountManagerEmail: z.string().email(),
  hotelName: z.string().min(1).max(200),
  classification: z.string().min(1).max(80),
  rooms: z.number().int().nonnegative(),
  city: z.string().min(1).max(80),
  referenceCode: z.string().min(1).max(30),
  requesterName: z.string().max(120).optional(),
  requesterEmail: z.string().email().optional(),
});

export type TourRequestPayload = z.infer<typeof TourRequestSchema>;

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function sendTourRequestAction(
  payload: TourRequestPayload,
): Promise<SendResult> {
  const parsed = TourRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? "Invalid payload",
    };
  }
  const data = parsed.data;

  let resend;
  try {
    resend = getResend();
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Resend not configured",
    };
  }

  const templateInput: TourRequestInput = {
    accountManagerName: data.accountManagerName,
    hotelName: data.hotelName,
    classification: data.classification,
    rooms: data.rooms,
    city: data.city,
    referenceCode: data.referenceCode,
    requesterName: data.requesterName,
    requesterEmail: data.requesterEmail,
  };
  const { subject, html, text } = renderTourRequest(templateInput);

  try {
    const res = await resend.emails.send({
      from: getDefaultFromAddress(),
      to: data.accountManagerEmail,
      // If we have a requester email, allow the account manager to reply
      // directly to them without bouncing through HotelVALORA.
      replyTo: data.requesterEmail,
      subject,
      html,
      text,
      // Tag the delivery for Resend's analytics dashboard.
      tags: [
        { name: "kind", value: "tour-request" },
        { name: "reference", value: data.referenceCode.replace(/[^A-Za-z0-9_-]/g, "_") },
      ],
    });

    if (res.error) {
      return { ok: false, error: res.error.message };
    }
    return { ok: true, id: res.data?.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Email send failed",
    };
  }
}
