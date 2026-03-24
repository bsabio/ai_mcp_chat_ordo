import { redirect } from "next/navigation";

import { ProfileSettingsPanel } from "@/components/profile/ProfileSettingsPanel";
import { getSessionUser } from "@/lib/auth";
import { createProfileService } from "@/lib/profile/profile-service";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getSessionUser();

  if (user.roles.includes("ANONYMOUS")) {
    redirect("/login");
  }

  const profile = await createProfileService().getProfile(user.id);

  return <ProfileSettingsPanel initialProfile={profile} />;
}
