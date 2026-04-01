import { getInstanceIdentity } from "@/lib/config/instance";
import { PublicStatusPage } from "@/components/public/PublicStatusPage";

export default function AccessDeniedPage() {
  const identity = getInstanceIdentity();

  return (
    <PublicStatusPage
      brandName={identity.name}
      eyebrow="Access denied"
      title="This page is outside your current workspace"
      description="Return to a route your account can load, or sign in with the right account before trying again."
      primaryAction={{ href: "/", label: "Return home" }}
      secondaryAction={{ href: "/login", label: "Sign in" }}
    />
  );
}
