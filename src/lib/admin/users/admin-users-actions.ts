import { revalidatePath } from "next/cache";

import { UserAdminInteractor, VALID_ROLE_IDS } from "@/core/use-cases/UserAdminInteractor";
import { getUserDataMapper } from "@/adapters/RepositoryFactory";
import { readRequiredText } from "@/lib/admin/shared/admin-form-parsers";
import { withAdminAction } from "@/lib/admin/shared/admin-action-helpers";
import type { RoleName } from "@/core/entities/user";

const ROLE_ID_VALUES = Object.values(VALID_ROLE_IDS);

export function createUserAdminInteractor(): UserAdminInteractor {
  return new UserAdminInteractor(getUserDataMapper());
}

export function parseRoleForm(formData: FormData): { roleId: string } {
  const roleId = readRequiredText(formData, "roleId");
  if (!ROLE_ID_VALUES.includes(roleId)) {
    throw new Error(`Invalid role ID: ${roleId}`);
  }
  return { roleId };
}

export function parseAffiliateForm(formData: FormData): { enabled: boolean } {
  const raw = formData.get("enabled");
  return { enabled: raw === "true" || raw === "1" };
}

export function parseBulkRoleForm(formData: FormData): { ids: string[]; roleId: string } {
  const idsRaw = readRequiredText(formData, "ids");
  const ids = idsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) {
    throw new Error("No user IDs provided");
  }
  const roleId = readRequiredText(formData, "roleId");
  if (!ROLE_ID_VALUES.includes(roleId)) {
    throw new Error(`Invalid role ID: ${roleId}`);
  }
  return { ids, roleId };
}

export const updateRoleAction = withAdminAction(async (admin, formData) => {
  const userId = readRequiredText(formData, "userId");
  const { roleId } = parseRoleForm(formData);
  const interactor = createUserAdminInteractor();
  await interactor.updateRole(userId, roleId, admin.id);
  revalidatePath("/admin/users");
});

export const toggleAffiliateAction = withAdminAction(async (_admin, formData) => {
  const userId = readRequiredText(formData, "userId");
  const { enabled } = parseAffiliateForm(formData);
  const interactor = createUserAdminInteractor();
  await interactor.toggleAffiliate(userId, enabled);
  revalidatePath("/admin/users");
});

export const bulkRoleChangeAction = withAdminAction(async (admin, formData) => {
  const { ids, roleId } = parseBulkRoleForm(formData);
  const interactor = createUserAdminInteractor();
  for (const id of ids) {
    await interactor.updateRole(id, roleId, admin.id);
  }
  revalidatePath("/admin/users");
});

export const ROLE_OPTIONS: Array<{ value: string; label: string; roleName: RoleName }> = [
  { value: "role_authenticated", label: "User", roleName: "AUTHENTICATED" },
  { value: "role_apprentice", label: "Apprentice", roleName: "APPRENTICE" },
  { value: "role_staff", label: "Staff", roleName: "STAFF" },
  { value: "role_admin", label: "Admin", roleName: "ADMIN" },
];
