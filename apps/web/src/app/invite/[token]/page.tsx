import type { Metadata } from "next";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { Mail, Building2, Megaphone, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { loadInvitationLanding, markInvitationOpened, type InvitationLanding } from "@/lib/invitations/live";
import { acceptInvitationAction } from "@/lib/invitations/accept";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "HotelVALORA · Institutional invitation",
  description:
    "Institutional invitation to HotelVALORA — hospitality investment intelligence + the operator network.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: { token: string };
  searchParams: { error?: string };
}

/**
 * Phase 2.D.5 · Public invitation landing.
 *
 * Recipient lands here from the Resend email. Server component renders
 * the invite preview + Accept form when sign-in matches; otherwise a
 * sign-in CTA that bounces back here after auth.
 *
 * NOT operator-gated — by design. The token is the bearer credential.
 */
export default async function InviteLandingPage({ params, searchParams }: PageProps) {
  // Opt out of Next.js Data Cache — invitation status flips frequently
  // (sent → opened → accepted/revoked/expired) and stale snapshots send
  // operators down the wrong landing branch.
  noStore();

  const token = params.token;
  const errorMessage = searchParams.error;

  const invitation = await loadInvitationLanding(token);
  if (!invitation) {
    return <NotFoundShell />;
  }
  // First-visit stamp · idempotent
  if (["pending", "sent", "delivered"].includes(invitation.status)) {
    await markInvitationOpened(invitation.id);
  }

  // Resolve current sign-in state
  let signedInEmail: string | null = null;
  try {
    const sb = createServerSupabaseClient();
    const { data } = await sb.auth.getUser();
    signedInEmail = data.user?.email?.toLowerCase() ?? null;
  } catch {
    signedInEmail = null;
  }

  const blockingState = resolveBlockingState(invitation);

  return (
    <main className="min-h-screen bg-[#f6f8f7] py-16">
      <div className="mx-auto max-w-2xl px-4">
        <BrandHeader />

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {blockingState ? (
            <BlockedBody invitation={invitation} state={blockingState} />
          ) : (
            <ActiveBody invitation={invitation} signedInEmail={signedInEmail} errorMessage={errorMessage} />
          )}
        </div>

        <p className="mt-8 text-center font-mono text-[10.5px] text-slate-400">
          HOTELVALORA · institutional hospitality investment intelligence · hotelvalora.com
        </p>
      </div>
    </main>
  );
}

function BrandHeader() {
  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-forest-900 px-4 py-1.5 font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-lime-300 shadow-md">
        <Sparkles size={11} /> Institutional Invitation
      </div>
      <h1 className="mt-4 font-headline text-3xl font-extrabold tracking-tighter text-forest-900 sm:text-4xl">
        Welcome to HOTELVALORA
      </h1>
      <p className="mt-2 text-[14px] text-slate-600">
        Hospitality investment intelligence · institutional underwriting · operator network
      </p>
    </div>
  );
}

type BlockingState =
  | { kind: "expired" }
  | { kind: "revoked" }
  | { kind: "declined" }
  | { kind: "bounced" }
  | { kind: "converted" };

function resolveBlockingState(invitation: InvitationLanding): BlockingState | null {
  if (invitation.status === "revoked") return { kind: "revoked" };
  if (invitation.status === "declined") return { kind: "declined" };
  if (invitation.status === "bounced") return { kind: "bounced" };
  if (invitation.status === "expired" || invitation.is_expired) return { kind: "expired" };
  if (invitation.status === "converted" || invitation.status === "accepted") return { kind: "converted" };
  return null;
}

function BlockedBody({ invitation, state }: { invitation: InvitationLanding; state: BlockingState }) {
  const blocks: Record<BlockingState["kind"], { title: string; body: string; tone: "amber" | "rose" | "emerald" }> = {
    expired: {
      title: "This invitation has expired",
      body: "Ask your HOTELVALORA contact to send a fresh invitation. Invitations are valid for 30 days from when they're sent.",
      tone: "amber",
    },
    revoked: {
      title: "This invitation was revoked",
      body: "Your contact at HOTELVALORA has cancelled this invitation. Reach out to them directly if you'd like a new one.",
      tone: "rose",
    },
    declined: {
      title: "This invitation was previously declined",
      body: "If that wasn't intentional, contact your HOTELVALORA representative to request a new invitation.",
      tone: "amber",
    },
    bounced: {
      title: "Delivery issue detected on this invitation",
      body: "Your invitation email bounced. Contact your HOTELVALORA representative so they can re-send to a working address.",
      tone: "rose",
    },
    converted: {
      title: "Already accepted",
      body: "You're already part of the platform. Sign in to your account to continue.",
      tone: "emerald",
    },
  };
  const cfg = blocks[state.kind];
  const tone =
    cfg.tone === "rose" ? "border-rose-300 bg-rose-50 text-rose-900"
    : cfg.tone === "emerald" ? "border-emerald-300 bg-emerald-50 text-emerald-900"
    : "border-amber-300 bg-amber-50 text-amber-900";

  return (
    <div className="p-8">
      <div className={`flex items-start gap-3 rounded-xl border ${tone} p-4`}>
        {state.kind === "converted" ? (
          <CheckCircle2 size={16} className="mt-0.5" />
        ) : (
          <AlertTriangle size={16} className="mt-0.5" />
        )}
        <div>
          <p className="font-headline text-[14px] font-bold">{cfg.title}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed">{cfg.body}</p>
        </div>
      </div>
      <InvitationContext invitation={invitation} />
      {state.kind === "converted" && (
        <div className="mt-6 text-center">
          <Link
            href="/library"
            className="inline-flex items-center gap-2 rounded-md bg-forest-900 px-4 py-2 font-headline text-[11px] font-extrabold uppercase tracking-[0.22em] text-lime-300 hover:bg-forest-900/90"
          >
            Sign in to your account
          </Link>
        </div>
      )}
    </div>
  );
}

function ActiveBody({
  invitation,
  signedInEmail,
  errorMessage,
}: {
  invitation: InvitationLanding;
  signedInEmail: string | null;
  errorMessage?: string;
}) {
  const tierLabel = formatTier(invitation.default_subscription_tier);

  return (
    <div className="p-8">
      {errorMessage && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-rose-300 bg-rose-50 p-3 text-rose-900">
          <AlertTriangle size={14} className="mt-0.5" />
          <p className="text-[12.5px] leading-relaxed">{errorMessage}</p>
        </div>
      )}

      <p className="text-[14px] leading-relaxed text-slate-700">
        {invitation.contact?.full_name?.trim()
          ? `${invitation.contact.full_name.trim().split(/\s+/)[0]}, you've been invited.`
          : "You've been invited."}
        {" "}HOTELVALORA is an institutional platform — sourcing, underwriting, and operator coverage across
        the hospitality investment universe.
      </p>

      <InvitationContext invitation={invitation} />

      {tierLabel && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-lime-300/60 bg-lime-50 px-3 py-2">
          <span className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-forest-900">
            Plan on acceptance
          </span>
          <span className="ml-auto font-headline text-[12px] font-extrabold text-forest-900">{tierLabel}</span>
        </div>
      )}

      <div className="mt-6 border-t border-slate-200 pt-6">
        {signedInEmail ? (
          <>
            <p className="mb-3 text-[12.5px] text-slate-600">
              Signed in as <span className="font-mono text-[12px] text-slate-800">{signedInEmail}</span>.
              {invitation.invited_email.toLowerCase() !== signedInEmail && (
                <>
                  <br />
                  <span className="font-mono text-[11px] text-amber-700">
                    Note: this invitation was sent to {invitation.invited_email}. You can still accept — the link is the receipt.
                  </span>
                </>
              )}
            </p>
            <form action={acceptInvitationAction}>
              <input type="hidden" name="token" value={invitation.id} />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-forest-900 px-4 py-2.5 font-headline text-[11.5px] font-extrabold uppercase tracking-[0.22em] text-lime-300 shadow-sm hover:bg-forest-900/90"
              >
                Accept invitation
              </button>
            </form>
            <p className="mt-3 text-center font-mono text-[10.5px] text-slate-500">
              By accepting you agree to the operator allow-listed terms. Activation is instant; the operator who
              invited you is notified.
            </p>
          </>
        ) : (
          <>
            <p className="mb-3 text-[12.5px] text-slate-600">
              Sign in to accept. We use Google as the institutional identity provider — no separate password to
              remember.
            </p>
            <Link
              href={`/login?next=${encodeURIComponent(`/invite/${invitation.id}`)}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-forest-900 px-4 py-2.5 font-headline text-[11.5px] font-extrabold uppercase tracking-[0.22em] text-lime-300 shadow-sm hover:bg-forest-900/90"
            >
              Sign in to accept
            </Link>
            <p className="mt-3 text-center font-mono text-[10.5px] text-slate-500">
              You'll come back here right after sign-in to confirm.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function InvitationContext({ invitation }: { invitation: InvitationLanding }) {
  return (
    <dl className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
      {invitation.contact?.company_name && (
        <Item icon={<Building2 size={12} />} label="Company">{invitation.contact.company_name}</Item>
      )}
      <Item icon={<Mail size={12} />} label="Invited address">{invitation.invited_email}</Item>
      {invitation.campaign && (
        <Item icon={<Megaphone size={12} />} label="Campaign">{invitation.campaign.name}</Item>
      )}
      {invitation.invited_by_email && (
        <Item icon={<Mail size={12} />} label="Sent by">{invitation.invited_by_email}</Item>
      )}
      {invitation.promo_code && (
        <Item icon={<Sparkles size={12} />} label="Promo">{invitation.promo_code}</Item>
      )}
      {invitation.expires_at && (
        <Item icon={<AlertTriangle size={12} />} label="Expires">{invitation.expires_at.slice(0, 10)}</Item>
      )}
    </dl>
  );
}

function Item({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="inline-flex items-center gap-1 font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {icon} {label}
      </dt>
      <dd className="font-mono text-[11.5px] text-slate-800">{children}</dd>
    </div>
  );
}

function formatTier(tier: string | null): string | null {
  if (!tier) return null;
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

function NotFoundShell() {
  return (
    <main className="min-h-screen bg-[#f6f8f7] py-16">
      <div className="mx-auto max-w-2xl px-4">
        <BrandHeader />
        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-900">
            <AlertTriangle size={16} className="mt-0.5" />
            <div>
              <p className="font-headline text-[14px] font-bold">Invitation not found</p>
              <p className="mt-1 text-[12.5px] leading-relaxed">
                The link may be malformed or the invitation was deleted. Contact your HOTELVALORA representative
                for a fresh invitation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
