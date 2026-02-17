import { NextResponse } from "next/server";
import { adminOnly } from "@/lib/adminRoute";

export async function GET(req) {
  return adminOnly(req, async () => {
    return NextResponse.json({ ok: true });
  });
}
