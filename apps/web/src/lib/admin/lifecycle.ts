/**
 * Phase 2.D.4 · Shared lifecycle-state derivation across contacts +
 * users + subscriptions surfaces. The conversion arc:
 *
 *   contact only → invited → onboarded → active subscriber → expired → inactive
 *
 * Inputs are the minimum signal the consumer typically has on hand
 * (everything optional · the function is defensive). Output is a tuple
 * of state + display label + tone — surfaces render the tone directly.
 */

export type LifecycleState =
  | "contact_only"
  | "invited"
  | "onboarded"
  | "active_subscriber"
  | "expired"
  | "inactive";

export interface LifecycleInputs {
  /** linked_contact_id on users (or linked_user_id on contacts) */
  has_linked_user: boolean;
  /** contact_invitations status rollup: 'not_invited' | 'invited' | 'onboarding' | 'converted' | 'declined' | 'bounced' */
  contact_invitation_status?: string | null;
  /** Most-recent subscription state for the linked user, when any */
  subscription_status?: string | null;
  subscription_expires_at?: string | null;
  /** User-level rollup (invitation_status on users) — 'inactive' | 'churn_risk' override the funnel */
  user_invitation_status?: string | null;
}

export interface LifecycleResult {
  state: LifecycleState;
  label: string;
  tone: "ok" | "warn" | "error" | "neutral" | "lime";
}

export function deriveLifecycle(input: LifecycleInputs): LifecycleResult {
  const {
    has_linked_user,
    contact_invitation_status,
    subscription_status,
    subscription_expires_at,
    user_invitation_status,
  } = input;

  // Explicit late-funnel overrides win first
  if (has_linked_user) {
    // Most recent subscription drives most of the state when a user exists
    if (subscription_status === "active" || subscription_status === "trialing") {
      // Check expires_at — past-due-with-future-expires still counts as active
      return { state: "active_subscriber", label: "Active subscriber", tone: "ok" };
    }
    if (subscription_status === "expired") {
      return { state: "expired", label: "Subscription expired", tone: "warn" };
    }
    if (subscription_status === "canceled") {
      return { state: "expired", label: "Subscription canceled", tone: "warn" };
    }
    if (subscription_status === "past_due") {
      return { state: "active_subscriber", label: "Active · payment past due", tone: "warn" };
    }
    // Linked user exists but no live subscription — onboarded state
    if (user_invitation_status === "inactive") {
      return { state: "inactive", label: "Inactive user", tone: "warn" };
    }
    if (user_invitation_status === "churn_risk") {
      return { state: "inactive", label: "Churn risk", tone: "error" };
    }
    if (subscription_expires_at) {
      const past = new Date(subscription_expires_at).getTime() < Date.now();
      if (past) return { state: "expired", label: "Subscription expired", tone: "warn" };
    }
    return { state: "onboarded", label: "Onboarded · no subscription", tone: "lime" };
  }

  // No linked user — pre-conversion funnel
  switch (contact_invitation_status) {
    case "invited":
    case "onboarding":
      return { state: "invited", label: "Invited · awaiting signup", tone: "lime" };
    case "converted":
      // Edge case — converted invitation but no users row linked back
      return { state: "onboarded", label: "Converted · awaiting link", tone: "warn" };
    case "declined":
      return { state: "contact_only", label: "Declined invitation", tone: "neutral" };
    case "bounced":
      return { state: "contact_only", label: "Invite bounced", tone: "warn" };
    case "not_invited":
    case null:
    case undefined:
    default:
      return { state: "contact_only", label: "Contact only · not invited", tone: "neutral" };
  }
}
