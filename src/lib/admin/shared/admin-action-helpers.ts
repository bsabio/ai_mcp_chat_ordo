/**
 * Higher-order wrapper for admin server actions.
 * Handles auth gating; caller handles revalidation + redirect.
 */

import type { User as SessionUser } from "@/core/entities/user";
import { requireAdminPageAccess } from "@/lib/journal/admin-journal";

export function withAdminAction<T>(
  handler: (user: SessionUser, formData: FormData) => Promise<T>,
): (formData: FormData) => Promise<T> {
  return async (formData: FormData) => {
    "use server";
    const user = await requireAdminPageAccess();
    return handler(user, formData);
  };
}
