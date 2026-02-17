import { NextResponse } from "next/server";
import { getAdminCookieName } from "@/lib/adminAuth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(getAdminCookieName(), "", { path: "/", maxAge: 0 });
  return res;
}
