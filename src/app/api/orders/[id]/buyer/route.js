import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(req, ctx) {
  const { id } = await ctx.params;
  const body = await req.json();

  const buyer_name = body?.buyer_name?.trim();
  const buyer_phone = body?.buyer_phone?.trim();
  const buyer_email = body?.buyer_email?.trim() || null;
  const buyer_document = body?.buyer_document?.trim() || null;
  const igreja_associada = body?.igreja_associada?.trim() || null;

  if (!buyer_name || !buyer_phone) {
    return NextResponse.json(
      { error: "buyer_name e buyer_phone são obrigatórios" },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({
      buyer_name,
      buyer_phone,
      buyer_email,
      buyer_document,
      igreja_associada,
    })
    .eq("id", id)
    .select(
      "id,buyer_name,buyer_phone,buyer_email,buyer_document,igreja_associada,status,total_cents",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ order: data });
}
