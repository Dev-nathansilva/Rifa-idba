"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function formatMoney(cents) {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

function labelStatus(status) {
  const map = {
    draft: "Rascunho",
    pending_payment: "Aguardando pagamento",
    paid: "Pago",
    expired: "Expirado",
    canceled: "Cancelado",
  };
  return map[status] || status;
}

function statusStyle(status) {
  if (status === "paid")
    return {
      color: "#10b981",
      background: "#064e3b44",
      border: "1px solid #065f46",
    };
  if (status === "pending_payment")
    return {
      color: "#f59e0b",
      background: "#78350f44",
      border: "1px solid #92400e",
    };
  return { color: "#666", background: "#111", border: "1px solid #222" };
}

export default function MeusTicketsClient() {
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
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.kicker}>Consulta</div>
            <h1 style={styles.title}>Meus tickets</h1>
          </div>
          <button onClick={() => router.back()} style={styles.ghostBtn}>
            Voltar
          </button>
        </header>

        <p style={styles.instruction}>
          Digite seu telefone com DDD (somente números).
        </p>

        <div style={styles.searchRow}>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ex: 85999998888"
            style={styles.input}
          />

          <button
            onClick={buscar}
            disabled={!canSearch || loading}
            style={{
              ...styles.primaryBtn,
              opacity: !canSearch || loading ? 0.5 : 1,
              cursor: !canSearch || loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? <div className="spinner-sm" /> : "Buscar"}
          </button>
        </div>

        {errorMsg && (
          <div style={styles.errorBox}>
            <b>Erro:</b> {errorMsg}
          </div>
        )}

        <div style={{ marginTop: 32 }}>
          {orders.length === 0 && !loading ? (
            <div style={styles.emptyState}>Nenhum pedido encontrado.</div>
          ) : (
            orders.map((o) => {
              const nums = (o.order_items || [])
                .map((i) => i.ticket_number)
                .sort((a, b) => a - b);
              const st = statusStyle(o.status);

              return (
                <div key={o.id} style={styles.orderCard}>
                  <div style={styles.orderTop}>
                    <div>
                      <div style={styles.orderId}>
                        Pedido: <span>{o.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                      <div style={{ ...styles.statusBadge, ...st }}>
                        {labelStatus(o.status)}
                      </div>
                      <div style={styles.date}>
                        {new Date(o.created_at).toLocaleString("pt-BR")}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={styles.price}>
                        {formatMoney(o.total_cents)}
                      </div>
                      <button
                        onClick={() => router.push(`/pagar/${o.id}`)}
                        style={styles.openBtn}
                      >
                        Detalhes
                      </button>
                    </div>
                  </div>

                  <div style={styles.ticketGrid}>
                    {nums.map((n) => (
                      <span key={n} style={styles.ticketChip}>
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

      <style jsx global>{`
        .spinner-sm {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(0, 0, 0, 0.1);
          border-top-color: #000;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#000",
    color: "#fff",
    fontFamily: "sans-serif",
  },
  container: { maxWidth: 600, margin: "0 auto", padding: "40px 20px" },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  kicker: {
    fontSize: 11,
    fontWeight: 800,
    opacity: 0.4,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  title: {
    margin: "4px 0 0 0",
    fontSize: 28,
    fontWeight: 900,
    letterSpacing: "-0.5px",
  },

  ghostBtn: {
    background: "#111",
    border: "1px solid #222",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  primaryBtn: {
    background: "#fff",
    border: "none",
    color: "#000",
    padding: "12px 24px",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },

  instruction: { fontSize: 14, color: "#666", marginBottom: 12 },
  searchRow: { display: "flex", gap: 10, marginBottom: 20 },
  input: {
    flex: 1,
    background: "#0a0a0a",
    border: "1px solid #222",
    padding: "12px 16px",
    borderRadius: 12,
    color: "#fff",
    fontSize: 16,
    outline: "none",
  },

  errorBox: {
    background: "#1a0000",
    color: "#ff4444",
    padding: 12,
    borderRadius: 12,
    fontSize: 13,
    border: "1px solid #440000",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 0",
    color: "#444",
    fontWeight: 600,
  },

  orderCard: {
    background: "#050505",
    border: "1px solid #1a1a1a",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  orderTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  orderId: { fontSize: 12, fontWeight: 800, color: "#444", marginBottom: 6 },
  statusBadge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  date: { fontSize: 11, color: "#444" },
  price: { fontSize: 18, fontWeight: 900, color: "#fff" },
  openBtn: {
    marginTop: 12,
    background: "#111",
    border: "1px solid #222",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },

  ticketGrid: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    borderTop: "1px solid #111",
    paddingTop: 16,
  },
  ticketChip: {
    background: "#111",
    color: "#fff",
    padding: "6px 10px",
    borderRadius: 8,
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid #222",
  },
};
