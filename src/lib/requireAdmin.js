import { cookies } from "next/headers";
import { getAdminCookieName, verifySessionToken } from "@/lib/adminAuth";

export async function requireAdmin(req) {
  const cookieStore = await cookies();
  const tokenFromCookie = cookieStore.get(getAdminCookieName())?.value;

  // fallback opcional por header (se quiser)
  const tokenFromHeader = req?.headers?.get?.("x-admin-session");

  const token = tokenFromCookie || tokenFromHeader;

  if (!verifySessionToken(token)) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
}
