export type RoleName = "ANONYMOUS" | "AUTHENTICATED" | "APPRENTICE" | "STAFF" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  roles: RoleName[];
}
