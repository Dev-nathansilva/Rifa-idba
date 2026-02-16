import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req, ctx) {
  const { ticketId } = await ctx.params;

  // 1) busca o ticket e o paid_order_id
  const { data: ticket, error: tErr } = await supabaseAdmin
    .from("tickets")
    .select("id,status,paid_order_id")
    .eq("id", ticketId)
    .single();

  if (tErr || !ticket) {
    return NextResponse.json(
      { error: "Ticket não encontrado" },
      { status: 404 },
    );
  }

  if (ticket.status !== "paid" || !ticket.paid_order_id) {
    return NextResponse.json(
      { error: "Ticket não está pago" },
      { status: 409 },
    );
  }

  // 2) busca só o nome do comprador
  const { data: order, error: oErr } = await supabaseAdmin
    .from("orders")
    .select("buyer_name")
    .eq("id", ticket.paid_order_id)
    .single();

  if (oErr || !order) {
    return NextResponse.json(
      { error: "Pedido não encontrado" },
      { status: 404 },
    );
  }

  return NextResponse.json({ buyer_name: order.buyer_name || null });
}
