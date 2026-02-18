import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { adminOnly } from "@/lib/adminRoute";

export async function GET(req, ctx) {
  return adminOnly(req, ctx, async () => {
    const { searchParams } = new URL(req.url);
    const limitRaw = Number(searchParams.get("limit") || 50);
    const limit = Math.min(limitRaw, 2000);

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
        igreja_associada,
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
  });
}
