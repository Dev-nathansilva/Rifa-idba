import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function assertAdmin(req) {
  const token = req.headers.get("x-admin-token");
  return process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
}

export async function POST(req, ctx) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json();
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
}
