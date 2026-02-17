import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

export async function adminOnly(req, ctx, handler) {
  try {
    await requireAdmin(req);
    return await handler(req, ctx);
  } catch (e) {
    if (e?.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: e?.message || "Erro" }, { status: 500 });
  }
}
