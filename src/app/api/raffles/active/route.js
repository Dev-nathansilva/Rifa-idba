import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  // você pode usar status='active' e pegar a mais recente
  const { data, error } = await supabaseAdmin
    .from("raffles")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Nenhuma rifa ativa" }, { status: 404 });
  }

  return NextResponse.json({ raffle: data });
}
