import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req, ctx) {
  const { id } = await ctx.params;

  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("id,order_id,status,amount_cents,pix_copy_paste,txid,created_at")
    .eq("order_id", id)
    .single();

  // quando não existe, o supabase retorna erro (PGRST116 geralmente)
  if (error) {
    return NextResponse.json({ payment: null }, { status: 200 });
  }

  return NextResponse.json({ payment: data });
}
