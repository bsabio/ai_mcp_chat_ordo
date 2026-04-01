"use client";

import { PublicStatusPage } from "@/components/public/PublicStatusPage";
import { useInstanceIdentity } from "@/lib/config/InstanceConfigContext";

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const identity = useInstanceIdentity();

  return (
    <div>
      <PublicStatusPage
        brandName={identity.name}
        eyebrow="Unexpected error"
        title="Something failed while loading this page"
        description="Retry the request or return home. If the problem persists, the current route may need attention from an operator."
        primaryAction={{ href: "/", label: "Return home" }}
      />
      <div className="mx-auto -mt-(--space-6) flex max-w-4xl px-(--space-frame-default) pb-(--space-section-loose)">
        <button type="button" className="btn-primary" onClick={() => reset()}>
          Retry
        </button>
      </div>
    </div>
  );
}
