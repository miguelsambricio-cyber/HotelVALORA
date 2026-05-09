import type { Metadata } from "next";
import {
  ProfileCompletionCard,
  ProfileForm,
  SettingsHeader,
} from "@/components/settings";
import { ProfileCompletionWidget } from "./profile-completion-widget";

export const metadata: Metadata = {
  title: "User Profile — HotelVALORA",
  description:
    "Manage your institutional identity and contact preferences for HotelVALORA.",
};

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      {/* Title + floating completion widget (mobile: stacked / desktop: row) */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <SettingsHeader
          title="User Profile"
          subtitle="Manage your institutional identity and contact preferences."
        />
        <ProfileCompletionWidget />
      </div>

      <ProfileForm />
    </div>
  );
}
