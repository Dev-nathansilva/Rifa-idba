import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generatePixCopyPaste } from "@/lib/pix";

export async function POST(req, ctx) {
  const { id } = await ctx.params;

  // 1) Pega pedido
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id,status,total_cents")
    .eq("id", id)
    .single();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 404 });
  }

  if (order.status !== "pending_payment" && order.status !== "draft") {
    return NextResponse.json(
      { error: `Pedido está em status ${order.status}` },
      { status: 409 },
    );
  }

  // Se ainda estiver draft, você pode exigir finalize antes (ou permitir aqui)
  // Eu permito: se estiver draft, muda pra pending_payment ao gerar pix
  if (order.status === "draft") {
    await supabaseAdmin
      .from("orders")
      .update({ status: "pending_payment" })
      .eq("id", id);
  }

  // 2) Valor em reais com 2 casas
  const amount = (order.total_cents / 100).toFixed(2);

  // 3) txid simples (até 35 chars)
  const txid = `ORD-${id.replace(/-/g, "").slice(0, 25)}`;

  // 4) Gera payload Pix
  const pix_copy_paste = generatePixCopyPaste({
    key: process.env.PIX_KEY,
    merchantName: process.env.PIX_MERCHANT_NAME || "SORTEIO",
    merchantCity: process.env.PIX_MERCHANT_CITY || "FORTALEZA",
    amount,
    txid,
    description: "Pagamento do Sorteio IDBA MOTO",
  });

  // 5) Salva/atualiza em payments (1 por pedido)
  const { data: payment, error: payError } = await supabaseAdmin
    .from("payments")
    .upsert(
      {
        order_id: id,
        method: "pix",
        status: "pending",
        amount_cents: order.total_cents,
        pix_copy_paste,
        txid,
      },
      { onConflict: "order_id" },
    )
    .select("id,order_id,status,amount_cents,pix_copy_paste,txid,created_at")
    .single();

  if (payError) {
    return NextResponse.json({ error: payError.message }, { status: 500 });
  }

  return NextResponse.json({ payment });
}
