import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

export async function POST(req) {
  try {
    const body = await req.json();

    const raffleId = body?.raffleId;
    const ticketNumbers = body?.ticketNumbers;
    const buyer = body?.buyer || {};

    // valida body base
    if (
      !raffleId ||
      !Array.isArray(ticketNumbers) ||
      ticketNumbers.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Body inválido. Use { raffleId, ticketNumbers: [0,3,7], buyer: { buyer_name, buyer_phone, buyer_email?, buyer_document? } }",
        },
        { status: 400 },
      );
    }

    // valida buyer (mínimo)
    const buyer_name = String(buyer?.buyer_name || "").trim();
    const buyer_phone = String(buyer?.buyer_phone || "").trim();

    if (buyer_name.length < 2) {
      return NextResponse.json(
        { error: "buyer_name é obrigatório" },
        { status: 400 },
      );
    }

    const buyer_phone_digits = onlyDigits(buyer_phone);

    if (buyer_phone_digits.length < 10) {
      return NextResponse.json(
        { error: "buyer_phone inválido (DDD + número)" },
        { status: 400 },
      );
    }

    const buyer_email = String(buyer?.buyer_email || "").trim() || null;
    const buyer_document = String(buyer?.buyer_document || "").trim() || null;

    // garantir inteiros únicos
    const uniqueNumbers = [...new Set(ticketNumbers.map((n) => Number(n)))];
    if (uniqueNumbers.some((n) => Number.isNaN(n) || n < 0)) {
      return NextResponse.json(
        { error: "ticketNumbers inválidos" },
        { status: 400 },
      );
    }

    // 1) reserva tickets + cria order (draft) via RPC
    const { data, error } = await supabaseAdmin.rpc("reserve_tickets", {
      p_raffle_id: raffleId,
      p_ticket_numbers: uniqueNumbers,
      p_reserve_minutes: 15,
    });

    if (error) {
      // quando ticket não disponível, a function lança exception
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    // data normalmente é o order_id (uuid)
    const orderId = data;
    if (!orderId) {
      return NextResponse.json(
        { error: "RPC não retornou orderId" },
        { status: 500 },
      );
    }

    // 2) salva dados do comprador + coloca o pedido como pending_payment
    const { error: upErr } = await supabaseAdmin
      .from("orders")
      .update({
        buyer_name,
        buyer_phone,
        buyer_email,
        buyer_document,
        status: "pending_payment",
      })
      .eq("id", orderId);

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ orderId });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Erro no servidor" },
      { status: 500 },
    );
  }
}
