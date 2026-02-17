import { NextResponse } from "next/server";
import { adminOnly } from "@/lib/adminRoute";

export async function GET(req, ctx) {
  return adminOnly(req, ctx, async () => {
    return NextResponse.json({ ok: true });
  });
}
