import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { adminOnly } from "@/lib/adminRoute";

const DELETE_PASSWORD = "DELETAR"; // 👈 pode deixar fixa

export async function POST(req, ctx) {
  return adminOnly(req, ctx, async () => {
    const { id } = await ctx.params;
    const body = await req.json();
    const password = body?.password;

    if (!id) {
      return NextResponse.json({ error: "id ausente" }, { status: 400 });
    }

    if (password !== DELETE_PASSWORD) {
      return NextResponse.json(
        { error: "Senha incorreta para exclusão" },
        { status: 403 },
      );
    }

    const { error } = await supabaseAdmin.rpc("delete_order_force", {
      p_order_id: id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
  });
}
