import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { adminOnly } from "@/lib/adminRoute";

export async function POST(req, ctx) {
  return adminOnly(req, ctx, async (_req, _ctx) => {
    const { id } = await _ctx.params; // ✅ params é Promise no seu Next

    if (!id) {
      return NextResponse.json({ error: "id ausente" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.rpc("approve_order", {
      p_order_id: id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
  });
}
