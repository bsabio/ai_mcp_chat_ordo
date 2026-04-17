import { notFound, redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import { MediaE2ELab } from "./MediaE2ELab";

export default async function MediaE2ELabPage() {
  if (process.env.ORDO_ENABLE_MEDIA_E2E_HARNESS !== "1") {
    notFound();
  }

  const user = await getSessionUser();
  if (user.roles[0] === "ANONYMOUS") {
    redirect("/login");
  }

  return <MediaE2ELab />;
}