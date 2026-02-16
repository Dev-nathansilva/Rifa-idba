import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req, ctx) {
  const { id } = await ctx.params;

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select(
      "id,raffle_id,buyer_name,buyer_phone,buyer_email,buyer_document,status,total_cents,created_at",
    )
    .eq("id", id)
    .single();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 404 });
  }

  const { data: items, error: itemsError } = await supabaseAdmin
    .from("order_items")
    .select("ticket_id,ticket_number,price_cents")
    .eq("order_id", id)
    .order("ticket_number", { ascending: true });

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ order, items });
}
