import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req, ctx) {
  const { id } = await ctx.params;

  const { data, error } = await supabaseAdmin
    .from("tickets")
    .select(
      "id,number,status,reserved_until,reserved_by_order_id,paid_order_id",
    )
    .eq("raffle_id", id)
    .order("number", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tickets: data });
}
