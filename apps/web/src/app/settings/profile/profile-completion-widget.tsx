"use client";

// Live wrapper around the static ProfileCompletionCard — subscribes to
// the profile store so the % updates as the user fills the form.

import { ProfileCompletionCard } from "@/components/settings";
import { useProfileCompletion } from "@/lib/settings";

export function ProfileCompletionWidget() {
  const ratio = useProfileCompletion();
  return <ProfileCompletionCard ratio={ratio} />;
}
