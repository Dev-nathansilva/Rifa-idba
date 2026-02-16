"use client";

import { useMemo, useState } from "react";
import { FiFilter, FiRefreshCw, FiEye, FiEyeOff, FiX } from "react-icons/fi";

function money(cents) {
  return `R$ ${(Number(cents || 0) / 100).toFixed(2)}`;
}
function fmtDate(s) {
  try {
    return new Date(s).toLocaleString("pt-BR");
  } catch {
    return s || "";
  }
}

function statusLabel(s) {
  if (s === "pending_payment") return "Aguardando";
  if (s === "paid") return "Pago";
  if (s === "canceled") return "Cancelado";
  if (s === "reserved") return "Reservado";
  return s || "-";
}

// Mantendo as cores das labels (badges) originais
function statusColors(status) {
  if (status === "paid") return { bg: "#16a34a", fg: "#fff" };
  if (status === "pending_payment") return { bg: "#1e293b", fg: "#fff" };
  if (status === "canceled") return { bg: "#ef4444", fg: "#fff" }; // Vermelho mantido aqui
  return { bg: "#f59e0b", fg: "#111827" };
}

function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

export default function AdminOrdersPage() {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const [q, setQ] = useState("");
  const [ticketQ, setTicketQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders?limit=2000", {
        headers: { "x-admin-token": token },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro");
      setOrders(data.orders || []);
      setShowFilters(false);
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function approve(orderId) {
    if (!confirm("Aprovar pagamento?")) return;
    setActingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/approve`, {
        method: "POST",
        headers: { "x-admin-token": token },
      });
      await load();
    } catch (e) {
      alert("Erro ao aprovar");
    } finally {
      setActingId(null);
    }
  }

  async function cancel(orderId) {
    if (!confirm("Cancelar pedido?")) return;
    setActingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "x-admin-token": token },
      });
      await load();
    } catch (e) {
      alert("Erro ao cancelar");
    } finally {
      setActingId(null);
    }
  }

  const rows = useMemo(() => {
    let filtered = (orders || []).map((o) => ({
      ...o,
      numbers: (o.order_items || [])
        .map((x) => Number(x.ticket_number))
        .filter((n) => !Number.isNaN(n))
        .sort((a, b) => a - b),
    }));
    const query = q.trim().toLowerCase();
    const tNum = ticketQ.trim().length ? Number(onlyDigits(ticketQ)) : null;

    if (statusFilter !== "all")
      filtered = filtered.filter((o) => o.status === statusFilter);
    if (tNum !== null)
      filtered = filtered.filter((o) => o.numbers.includes(tNum));
    if (query) {
      filtered = filtered.filter((o) =>
        [o.buyer_name, o.buyer_phone, o.buyer_email, o.buyer_document].some(
          (f) =>
            String(f || "")
              .toLowerCase()
              .includes(query),
        ),
      );
    }
    return filtered.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );
  }, [orders, q, ticketQ, statusFilter]);

  return (
    <div style={styles.page}>
      <header style={styles.headerWrap}>
        <div style={styles.headerContent}>
          <div style={styles.navMain}>
            <div style={styles.tokenArea}>
              <div style={styles.inputIconWrapper}>
                <input
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Token Admin"
                  style={styles.tokenInput}
                />
                <button
                  onClick={() => setShowToken(!showToken)}
                  style={styles.iconBtn}
                >
                  {showToken ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              <button onClick={load} disabled={loading} style={styles.syncBtn}>
                <FiRefreshCw className={loading ? "spin" : ""} />
                <span className="hide-mobile" style={{ marginLeft: 8 }}>
                  Sincronizar
                </span>
              </button>
            </div>
            <button
              onClick={() => setShowFilters(true)}
              style={styles.filterToggle}
            >
              <FiFilter /> Filtros {rows.length > 0 && `(${rows.length})`}
            </button>
          </div>
        </div>
      </header>

      {showFilters && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Filtros</h3>
              <button
                onClick={() => setShowFilters(false)}
                style={styles.closeBtn}
              >
                <FiX size={24} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nome, Celular, CPF ou E-mail"
                style={styles.input}
              />
              <input
                value={ticketQ}
                onChange={(e) => setTicketQ(e.target.value)}
                placeholder="Número do Ticket"
                style={styles.input}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={styles.input}
              >
                <option value="all">Todos os Status</option>
                <option value="pending_payment">Aguardando</option>
                <option value="paid">Pago</option>
                <option value="canceled">Cancelado</option>
              </select>
              <button
                onClick={() => setShowFilters(false)}
                style={styles.applyBtn}
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      <main style={styles.content}>
        <div style={styles.grid}>
          {rows.map((o) => {
            const sc = statusColors(o.status);
            const isCanceled = o.status === "canceled";
            const isPaid = o.status === "paid";
            const isPending = o.status === "pending_payment";
            const busy = actingId === o.id;

            return (
              <div key={o.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.buyerName}>
                      {o.buyer_name || "Sem nome"}
                    </div>
                    <div style={styles.buyerSub}>{o.buyer_phone}</div>
                  </div>
                  <span
                    style={{ ...styles.badge, background: sc.bg, color: sc.fg }}
                  >
                    {statusLabel(o.status)}
                  </span>
                </div>

                <div style={styles.buyerDetails}>
                  <div style={styles.buyerExtra}>{o.buyer_email || "-"}</div>
                  <div style={styles.buyerExtra}>{o.buyer_document || "-"}</div>
                  <div
                    style={{ ...styles.buyerExtra, marginTop: 4, opacity: 0.3 }}
                  >
                    {fmtDate(o.created_at)}
                  </div>
                </div>

                <div style={styles.numsSection}>
                  <div style={styles.numsWrap}>
                    {o.numbers.slice(0, 10).map((n) => (
                      <span key={n} style={styles.numChip}>
                        {String(n).padStart(4, "0")}
                      </span>
                    ))}
                    {o.numbers.length > 10 && (
                      <span style={styles.moreChip}>
                        +{o.numbers.length - 10}
                      </span>
                    )}
                  </div>
                </div>

                <div style={styles.cardFooter}>
                  <div style={styles.totalArea}>
                    <span style={styles.totalLabel}>TOTAL</span>
                    <span style={styles.totalValue}>
                      {money(o.total_cents)}
                    </span>
                  </div>
                  <div style={styles.actions}>
                    {/* Botão Aprovar: Verde se pendente, Cinza se não */}
                    <button
                      onClick={() => approve(o.id)}
                      disabled={!isPending || busy}
                      style={{
                        ...styles.actionBtn,
                        background: isPending ? "#16a34a" : "#334155",
                        color: isPending ? "#fff" : "#64748b",
                        cursor: isPending ? "pointer" : "not-allowed",
                      }}
                    >
                      APROVAR
                    </button>
                    {/* Botão Cancelar: Vermelho se puder cancelar, Cinza se não */}
                    <button
                      onClick={() => cancel(o.id)}
                      disabled={isPaid || isCanceled || busy}
                      style={{
                        ...styles.actionBtn,
                        background:
                          !isPaid && !isCanceled ? "#ef4444" : "#334155",
                        color: !isPaid && !isCanceled ? "#fff" : "#64748b",
                        cursor:
                          !isPaid && !isCanceled ? "pointer" : "not-allowed",
                      }}
                    >
                      CANCELAR
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <style jsx global>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% {
            transform: rotate(360deg);
          }
        }
        @media (max-width: 600px) {
          .hide-mobile {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#060a13",
    color: "#fff",
    fontFamily: "sans-serif",
  },
  headerWrap: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "rgba(11, 18, 32, 0.95)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid #1e293b",
    padding: "12px",
  },
  headerContent: { maxWidth: 1200, margin: "0 auto" },
  navMain: { display: "flex", gap: 10, flexWrap: "wrap" },
  tokenArea: { display: "flex", gap: 8, flex: 1, minWidth: "260px" },
  inputIconWrapper: { position: "relative", flex: 1 },
  tokenInput: {
    width: "100%",
    background: "#000",
    border: "1px solid #1e293b",
    padding: "12px 40px 12px 12px",
    borderRadius: 12,
    color: "#fff",
    outline: "none",
    boxSizing: "border-box",
  },
  iconBtn: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "#475569",
    cursor: "pointer",
    fontSize: 18,
  },
  syncBtn: {
    background: "#fff",
    color: "#000",
    border: "none",
    borderRadius: 12,
    padding: "0 16px",
    height: 46,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontWeight: 800,
  },
  filterToggle: {
    background: "#1e293b",
    color: "#fff",
    border: "1px solid #334155",
    padding: "0 20px",
    borderRadius: 12,
    height: 46,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 700,
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.8)",
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    background: "#0b1220",
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#fff",
    cursor: "pointer",
  },
  modalBody: { display: "flex", flexDirection: "column", gap: 12 },
  input: {
    background: "#060a13",
    border: "1px solid #1e293b",
    padding: "14px",
    borderRadius: 12,
    color: "#fff",
    outline: "none",
  },
  applyBtn: {
    background: "#fff",
    color: "#000",
    padding: "16px",
    borderRadius: 12,
    fontWeight: 900,
    border: "none",
    marginTop: 8,
    cursor: "pointer",
  },
  content: { maxWidth: 1200, margin: "0 auto", padding: "20px" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: 16,
  },
  card: {
    background: "#111827",
    border: "1px solid #1e293b",
    borderRadius: 20,
    padding: 18,
    display: "flex",
    flexDirection: "column",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  buyerName: {
    fontSize: 16,
    fontWeight: 900,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  buyerSub: { fontSize: 13, opacity: 0.5 },
  badge: {
    fontSize: 10,
    fontWeight: 900,
    padding: "4px 8px",
    borderRadius: 6,
    textTransform: "uppercase",
  },
  buyerDetails: {
    marginBottom: 14,
    padding: "10px 0",
    borderTop: "1px solid rgba(255,255,255,0.05)",
  },
  buyerExtra: { fontSize: 12, opacity: 0.6, marginBottom: 2 },
  numsSection: {
    background: "rgba(0,0,0,0.2)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  numsWrap: { display: "flex", flexWrap: "wrap", gap: 5 },
  numChip: {
    background: "#1e293b",
    padding: "4px 6px",
    borderRadius: 4,
    fontSize: 11,
    fontFamily: "monospace",
  },
  moreChip: { fontSize: 11, opacity: 0.3 },
  cardFooter: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    borderTop: "1px solid rgba(255,255,255,0.05)",
    paddingTop: 14,
    marginTop: "auto",
  },
  totalArea: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 10, fontWeight: 800, opacity: 0.3 },
  totalValue: { fontSize: 20, fontWeight: 900 },
  actions: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  actionBtn: {
    border: "none",
    padding: "14px",
    borderRadius: 12,
    fontWeight: 900,
    fontSize: 11,
    transition: "0.2s",
  },
};
