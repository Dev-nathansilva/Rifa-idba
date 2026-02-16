import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function assertAdmin(req) {
  const token = req.headers.get("x-admin-token");
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return false;
  }
  return true;
}

export async function GET(req) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);

  // lista pedidos + itens (números)
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      `
      id,
      raffle_id,
      status,
      total_cents,
      buyer_name,
      buyer_phone,
      buyer_email,
      buyer_document,
      created_at,
      paid_at,
      canceled_at,
      order_items:order_items(
        id,
        ticket_number
      )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: data || [] });
}
