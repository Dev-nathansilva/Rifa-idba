import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req, ctx) {
  const { id } = await ctx.params;

  const { data, error } = await supabaseAdmin
    .from("raffles")
    .select("id,title,ticket_price_cents,ticket_count,status,created_at")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ raffle: data });
}
