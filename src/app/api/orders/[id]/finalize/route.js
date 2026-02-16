import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req, ctx) {
  const { id } = await ctx.params;

  // pega pedido
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id,status,buyer_name,buyer_phone,total_cents")
    .eq("id", id)
    .single();

  if (orderError)
    return NextResponse.json({ error: orderError.message }, { status: 404 });

  if (!order.buyer_name || !order.buyer_phone) {
    return NextResponse.json(
      { error: "Preencha nome e telefone antes de finalizar" },
      { status: 400 },
    );
  }

  if (order.status !== "draft") {
    return NextResponse.json(
      { error: `Pedido já está em status ${order.status}` },
      { status: 409 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ status: "pending_payment" })
    .eq("id", id)
    .select("id,status,total_cents")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ order: data });
}
