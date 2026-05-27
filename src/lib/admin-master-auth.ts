import { cookies } from "next/headers";

export async function verificarAdminMaster(): Promise<boolean> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("admin-session");
  const token = process.env.ADMIN_MASTER_TOKEN;
  return !!(cookie && token && cookie.value === token);
}
