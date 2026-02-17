import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { adminOnly } from "@/lib/adminRoute";

export async function POST(req, ctx) {
  return adminOnly(req, async () => {
    const { id } = ctx.params;
    const body = await req.json().catch(() => ({}));
    const status = body?.status;

    if (!status) {
      return NextResponse.json(
        { error: "status é obrigatório" },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin.rpc("set_order_status", {
      p_order_id: id,
      p_status: status,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
  });
}
