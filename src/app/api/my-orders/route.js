import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const phone = (searchParams.get("phone") || "").trim(); // formatado
  const raffleId = searchParams.get("raffleId");

  if (!phone) {
    return NextResponse.json({ error: "phone é obrigatório" }, { status: 400 });
  }

  let query = supabaseAdmin
    .from("orders")
    .select(
      "id,raffle_id,status,total_cents,created_at,buyer_name,buyer_phone,order_items(ticket_number,price_cents)",
    )
    .eq("buyer_phone", phone)
    .order("created_at", { ascending: false });

  if (raffleId) query = query.eq("raffle_id", raffleId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: data || [] });
}
