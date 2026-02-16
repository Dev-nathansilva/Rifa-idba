"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function pad4(n) {
  return String(n).padStart(4, "0");
}

function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

function money(cents) {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

const CHECKOUT_KEY = "checkout_active_raffle";

export default function CheckoutPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [raffle, setRaffle] = useState(null);
  const [ticketNumbers, setTicketNumbers] = useState([]);

  const [form, setForm] = useState({
    buyer_name: "",
    buyer_phone: "",
    buyer_email: "",
    buyer_document: "",
  });

  // 1) Carregar rifa ativa + seleção do localStorage
  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMsg("");

      // pegar seleção salva
      let saved = null;
      try {
        saved = JSON.parse(localStorage.getItem(CHECKOUT_KEY) || "null");
      } catch {
        saved = null;
      }

      const nums = Array.isArray(saved?.ticketNumbers)
        ? saved.ticketNumbers
        : [];

      // ✅ SE NÃO TEM NÚMERO, REDIRECIONA AUTOMATICAMENTE
      if (nums.length === 0) {
        router.replace("/rifa");
        return; // não continua
      }

      setTicketNumbers(nums.slice().sort((a, b) => a - b));

      try {
        // pegar rifa ativa
        const r = await fetch("/api/raffles/active");
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || "Erro ao buscar rifa ativa");

        setRaffle(d.raffle);
      } catch (e) {
        setErrorMsg(e.message || "Erro");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const totalCents = useMemo(() => {
    if (!raffle) return 0;
    return ticketNumbers.length * raffle.ticket_price_cents;
  }, [raffle, ticketNumbers]);

  const canContinue = useMemo(() => {
    const nameOk = form.buyer_name.trim().length >= 2;
    const phoneDigits = onlyDigits(form.buyer_phone);
    const phoneOk = phoneDigits.length >= 10; // DDD + número
    return nameOk && phoneOk && ticketNumbers.length > 0 && !!raffle && !saving;
  }, [form, ticketNumbers, raffle, saving]);

  function onChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function goBackToRaffle() {
    router.push("/rifa");
  }

  async function continuarParaPagamento() {
    if (!canContinue) return;

    setSaving(true);
    setErrorMsg("");

    try {
      // 2) criar pedido + reservar AGORA (backend)
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raffleId: raffle.id,
          ticketNumbers,
          buyer: {
            buyer_name: form.buyer_name.trim(),
            buyer_phone: onlyDigits(form.buyer_phone),
            buyer_email: form.buyer_email.trim() || null,
            buyer_document: form.buyer_document.trim() || null,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Não foi possível reservar os números");
      }

      const orderId = data.orderId;

      // 3) limpar seleção salva (já virou pedido)
      try {
        localStorage.removeItem(CHECKOUT_KEY);
      } catch {}

      // 4) ir pro pagamento
      router.push(`/pagar/${orderId}`);
    } catch (e) {
      setErrorMsg(e.message || "Erro");
    } finally {
      setSaving(false);
    }
  }

  // enquanto redireciona, pode deixar só carregando
  if (loading) return <p style={{ padding: 20 }}>Carregando checkout...</p>;

  // se falhou rifa ativa, mostra erro + voltar
  if (!raffle) {
    return (
      <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Checkout</h1>

        {errorMsg ? (
          <div style={{ background: "#fee2e2", padding: 12, borderRadius: 10 }}>
            <b>Erro:</b> {errorMsg}
          </div>
        ) : (
          <p>Sem dados para checkout.</p>
        )}

        <button
          onClick={goBackToRaffle}
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "white",
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          Voltar para a rifa
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ margin: 0 }}>Finalizar pedido</h1>
        <button
          onClick={goBackToRaffle}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "white",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          Voltar
        </button>
      </div>

      <p style={{ opacity: 0.75, marginTop: 8 }}>
        Rifa: <b>{raffle.title}</b>
      </p>

      {errorMsg && (
        <div
          style={{
            background: "#fee2e2",
            padding: 12,
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          <b>Erro:</b> {errorMsg}
        </div>
      )}

      <div
        style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16 }}
      >
        {/* formulário */}
        <div
          style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}
        >
          <h2 style={{ marginTop: 0 }}>Seus dados</h2>

          <Field label="Nome completo *">
            <input
              value={form.buyer_name}
              onChange={(e) => onChange("buyer_name", e.target.value)}
              placeholder="Ex: João da Silva"
              style={inputStyle}
            />
          </Field>

          <Field label="Telefone com DDD *">
            <input
              value={form.buyer_phone}
              onChange={(e) => onChange("buyer_phone", e.target.value)}
              placeholder="Ex: 85999998888"
              style={inputStyle}
            />
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              Vamos usar esse número para você consultar seus tickets.
            </div>
          </Field>

          <Field label="E-mail (opcional)">
            <input
              value={form.buyer_email}
              onChange={(e) => onChange("buyer_email", e.target.value)}
              placeholder="Ex: joao@email.com"
              style={inputStyle}
            />
          </Field>

          <Field label="CPF (opcional)">
            <input
              value={form.buyer_document}
              onChange={(e) => onChange("buyer_document", e.target.value)}
              placeholder="Ex: 12345678900"
              style={inputStyle}
            />
          </Field>

          <button
            onClick={continuarParaPagamento}
            disabled={!canContinue}
            style={{
              marginTop: 8,
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "none",
              background: canContinue ? "#111827" : "#9ca3af",
              color: "white",
              cursor: canContinue ? "pointer" : "not-allowed",
              fontWeight: 900,
              fontSize: 16,
            }}
          >
            {saving ? "Reservando..." : "Continuar para pagamento"}
          </button>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            Ao continuar, os números serão reservados por 15 minutos e você
            receberá o Pix.
          </div>
        </div>

        {/* resumo */}
        <div
          style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}
        >
          <h2 style={{ marginTop: 0 }}>Resumo</h2>

          <div style={{ opacity: 0.8 }}>Números selecionados</div>
          <div
            style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            {ticketNumbers.map((n) => (
              <span
                key={n}
                style={{
                  background: "#111827",
                  color: "white",
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontFamily: "monospace",
                }}
              >
                {pad4(n)}
              </span>
            ))}
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span style={{ opacity: 0.7 }}>Total</span>
            <b style={{ fontSize: 18 }}>{money(totalCents)}</b>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
};
