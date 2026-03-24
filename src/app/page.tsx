import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import { resolveShellHomeHref } from "@/lib/shell/shell-navigation";
import { ChatSurface } from "@/frameworks/ui/ChatSurface";

export default async function Home() {
  const _user = await getSessionUser();
  const homeHref = resolveShellHomeHref();

  if (homeHref !== "/") {
    redirect(homeHref);
  }

  return <ChatSurface mode="embedded" />;
}
