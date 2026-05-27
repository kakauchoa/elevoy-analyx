import { cookies } from "next/headers";

export function verificarAdminMaster(): boolean {
  const cookieStore = cookies();
  const cookie = cookieStore.get("admin-session");
  const token = process.env.ADMIN_MASTER_TOKEN;
  return !!(cookie && token && cookie.value === token);
}
