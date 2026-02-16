"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function formatMoney(cents) {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

function labelStatus(status) {
  if (status === "draft") return "Rascunho";
  if (status === "pending_payment") return "Aguardando pagamento";
  if (status === "paid") return "Pago";
  if (status === "expired") return "Expirado";
  if (status === "canceled") return "Cancelado";
  return status;
}

export default function MeusTicketsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raffleId = searchParams.get("raffleId") || "";

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  const canSearch = useMemo(
    () => phone.replace(/\D/g, "").length >= 10,
    [phone],
  );

  async function buscar() {
    setLoading(true);
    setErrorMsg("");
    setOrders([]);

    try {
      const qs = new URLSearchParams();
      qs.set("phone", phone);
      if (raffleId) qs.set("raffleId", raffleId);

      const res = await fetch(`/api/my-orders?${qs.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Erro ao buscar pedidos");

      setOrders(data.orders || []);
    } catch (e) {
      setErrorMsg(e.message || "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0 }}>Meus tickets</h1>
        <button
          onClick={() => router.back()}
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

      <p style={{ opacity: 0.75 }}>
        Digite seu telefone com DDD (somente números). Ex: <b>85999998888</b>
      </p>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Telefone com DDD"
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            width: 220,
          }}
        />

        <button
          onClick={buscar}
          disabled={!canSearch || loading}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "none",
            background: !canSearch || loading ? "#9ca3af" : "#111827",
            color: "white",
            cursor: !canSearch || loading ? "not-allowed" : "pointer",
            fontWeight: 900,
          }}
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {errorMsg && (
        <div
          style={{
            marginTop: 12,
            background: "#fee2e2",
            padding: 12,
            borderRadius: 10,
          }}
        >
          <b>Erro:</b> {errorMsg}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        {orders.length === 0 && !loading ? (
          <p style={{ opacity: 0.7 }}>Nenhum pedido encontrado.</p>
        ) : (
          orders.map((o) => {
            const nums = (o.order_items || [])
              .map((i) => i.ticket_number)
              .sort((a, b) => a - b);
            return (
              <div
                key={o.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900 }}>
                      Pedido:{" "}
                      <span style={{ fontFamily: "monospace" }}>
                        {o.id.slice(0, 8)}
                      </span>
                    </div>
                    <div style={{ opacity: 0.8 }}>{labelStatus(o.status)}</div>
                    <div style={{ opacity: 0.8 }}>
                      {new Date(o.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 900 }}>
                      {formatMoney(o.total_cents)}
                    </div>
                    <button
                      onClick={() => router.push(`/pagar/${o.id}`)}
                      style={{
                        marginTop: 8,
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        background: "white",
                        cursor: "pointer",
                        fontWeight: 800,
                      }}
                    >
                      Abrir
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {nums.map((n) => (
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
                      {String(n).padStart(4, "0")}
                    </span>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
