"use client";

import { useMemo, useState } from "react";

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

function statusColors(status) {
  if (status === "paid") return { bg: "#16a34a", fg: "#fff" };
  if (status === "pending_payment") return { bg: "#111827", fg: "#fff" };
  if (status === "canceled") return { bg: "#ef4444", fg: "#fff" };
  return { bg: "#f59e0b", fg: "#111827" };
}

function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

export default function AdminOrdersPage() {
  const [token, setToken] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // busca geral (nome/telefone/id)
  const [q, setQ] = useState("");

  // busca exclusiva por ticket
  const [ticketQ, setTicketQ] = useState("");

  const [statusFilter, setStatusFilter] = useState("all"); // all | pending_payment | paid | canceled | reserved

  async function load() {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/orders?limit=2000", {
        headers: { "x-admin-token": token },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao carregar pedidos");
      setOrders(data.orders || []);
    } catch (e) {
      setErrorMsg(e.message || "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function approve(orderId) {
    if (!confirm("Confirmar pagamento?")) return;
    setActingId(orderId);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/approve`, {
        method: "POST",
        headers: { "x-admin-token": token },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao aprovar");
      await load();
    } catch (e) {
      setErrorMsg(e.message || "Erro");
    } finally {
      setActingId(null);
    }
  }

  async function cancel(orderId) {
    if (!confirm("Cancelar pedido e liberar números?")) return;
    setActingId(orderId);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "x-admin-token": token },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao cancelar");
      await load();
    } catch (e) {
      setErrorMsg(e.message || "Erro");
    } finally {
      setActingId(null);
    }
  }

  const rows = useMemo(() => {
    const list = (orders || []).map((o) => {
      const nums = (o.order_items || [])
        .map((x) => x.ticket_number)
        .filter((n) => n !== null && n !== undefined)
        .map((n) => Number(n))
        .filter((n) => !Number.isNaN(n))
        .sort((a, b) => a - b);

      return { ...o, numbers: nums };
    });

    const query = q.trim().toLowerCase();
    const ticketDigits = onlyDigits(ticketQ.trim());
    const ticketNumber = ticketDigits.length ? Number(ticketDigits) : null;

    let filtered = list;

    // status
    if (statusFilter !== "all") {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    // filtro EXCLUSIVO por número (match exato)
    if (ticketNumber !== null && !Number.isNaN(ticketNumber)) {
      filtered = filtered.filter((o) =>
        o.numbers.some((n) => n === ticketNumber),
      );
    }

    // busca geral (NÃO usa numbers)
    if (query) {
      filtered = filtered.filter((o) => {
        const id = String(o.id || "").toLowerCase();
        const name = String(o.buyer_name || "").toLowerCase();
        const phone = String(o.buyer_phone || "").toLowerCase();
        return (
          id.includes(query) || name.includes(query) || phone.includes(query)
        );
      });
    }

    // pendentes primeiro, depois mais recentes
    const rank = (s) => {
      if (s === "pending_payment") return 0;
      if (s === "reserved") return 1;
      if (s === "paid") return 2;
      if (s === "canceled") return 3;
      return 9;
    };

    filtered.sort((a, b) => {
      const r = rank(a.status) - rank(b.status);
      if (r !== 0) return r;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return filtered;
  }, [orders, q, ticketQ, statusFilter]);

  const counts = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "pending_payment").length;
    const reserved = orders.filter((o) => o.status === "reserved").length;
    const paid = orders.filter((o) => o.status === "paid").length;
    const canceled = orders.filter((o) => o.status === "canceled").length;
    return { total, pending, reserved, paid, canceled };
  }, [orders]);

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.headerWrap}>
        <div style={styles.header}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={styles.kicker}>Admin</div>
              <div style={styles.title}>Pedidos</div>
              <div style={styles.sub}>
                Total: <b>{counts.total}</b> • Aguardando:{" "}
                <b>{counts.pending}</b> • Pagos: <b>{counts.paid}</b>
              </div>
            </div>

            <button
              onClick={load}
              disabled={!token || loading}
              style={btnPrimary(!token || loading)}
            >
              {loading ? "Carregando..." : "Atualizar"}
            </button>
          </div>

          {/* Controls row */}
          <div style={styles.controlsRow}>
            <div style={styles.control}>
              <div style={styles.label}>Token do Admin</div>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Cole o ADMIN_TOKEN"
                style={styles.input}
              />
            </div>

            <div style={styles.control}>
              <div style={styles.label}>Buscar (nome/telefone/id)</div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ex: João, 8599..., pedaço do ID"
                style={styles.input}
              />
            </div>

            <div style={styles.control}>
              <div style={styles.label}>Buscar por número</div>
              <input
                value={ticketQ}
                onChange={(e) => setTicketQ(e.target.value)}
                inputMode="numeric"
                placeholder="Ex: 7 ou 0007"
                style={styles.input}
              />
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  opacity: 0.65,
                  color: "white",
                }}
              >
                Procura match exato no ticket.
              </div>
            </div>

            <div style={styles.control}>
              <div style={styles.label}>Status</div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ ...styles.input, cursor: "pointer" }}
              >
                <option value="all">Todos</option>
                <option value="pending_payment">Aguardando</option>
                <option value="reserved">Reservado</option>
                <option value="paid">Pago</option>
                <option value="canceled">Cancelado</option>
              </select>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  opacity: 0.65,
                  color: "white",
                }}
              >
                Resultados: <b>{rows.length}</b>
              </div>
            </div>
          </div>

          {/* quick actions */}
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 10,
            }}
          >
            <button
              onClick={() => {
                setQ("");
                setTicketQ("");
                setStatusFilter("all");
              }}
              style={btnGhost()}
            >
              Limpar filtros
            </button>
          </div>

          {errorMsg && (
            <div style={styles.errorBox}>
              <b>Erro:</b> {errorMsg}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        <div style={styles.grid}>
          {rows.length === 0 ? (
            <div style={{ opacity: 0.7, color: "white" }}>
              Nenhum resultado. (Cole o token e clique em “Atualizar”)
            </div>
          ) : (
            rows.map((o) => {
              const sc = statusColors(o.status);
              const canApprove = o.status === "pending_payment";
              const canCancel = o.status !== "paid" && o.status !== "canceled";
              const busy = actingId === o.id;

              return (
                <div key={o.id} style={styles.card}>
                  {/* Card header */}
                  <div style={styles.cardHeader}>
                    <div style={{ minWidth: 0 }}>
                      <div style={styles.cardMetaLabel}>Comprador</div>
                      <div style={styles.buyerName} title={o.buyer_name || ""}>
                        {o.buyer_name || "-"}
                      </div>
                      <div style={styles.buyerSub}>
                        {o.buyer_phone || "-"} • {fmtDate(o.created_at)}
                      </div>
                    </div>

                    <span
                      style={{
                        ...styles.badge,
                        background: sc.bg,
                        color: sc.fg,
                      }}
                    >
                      {statusLabel(o.status)}
                    </span>
                  </div>

                  {/* Numbers */}
                  <div style={{ marginTop: 12 }}>
                    <div style={styles.cardMetaLabel}>
                      Números ({o.numbers.length})
                    </div>
                    <div style={styles.numsWrap}>
                      {o.numbers.slice(0, 24).map((n) => (
                        <span key={n} style={styles.numChip}>
                          {String(n).padStart(4, "0")}
                        </span>
                      ))}
                      {o.numbers.length > 24 && (
                        <span style={styles.moreChip}>
                          +{o.numbers.length - 24}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Total + id */}
                  <div style={styles.cardFooterTop}>
                    <div>
                      <div style={styles.cardMetaLabel}>Total</div>
                      <div style={styles.total}>{money(o.total_cents)}</div>
                    </div>

                    <div style={{ textAlign: "right", minWidth: 0 }}>
                      <div style={styles.cardMetaLabel}>ID</div>
                      <div style={styles.monoId} title={o.id}>
                        {o.id}
                      </div>
                    </div>
                  </div>

                  {/* Actions (always aligned at bottom) */}
                  <div style={styles.actions}>
                    <button
                      onClick={() => approve(o.id)}
                      disabled={!canApprove || busy}
                      style={btnAction(
                        canApprove && !busy ? "#16a34a" : "#9ca3af",
                      )}
                    >
                      Aprovar
                    </button>

                    <button
                      onClick={() => cancel(o.id)}
                      disabled={!canCancel || busy}
                      style={btnAction(
                        canCancel && !busy ? "#ef4444" : "#9ca3af",
                      )}
                    >
                      Cancelar
                    </button>
                  </div>

                  {o.status === "paid" && o.paid_at && (
                    <div style={styles.smallNote}>
                      Pago em: {fmtDate(o.paid_at)}
                    </div>
                  )}
                  {o.status === "canceled" && o.canceled_at && (
                    <div style={styles.smallNote}>
                      Cancelado em: {fmtDate(o.canceled_at)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0b1220",
  },
  headerWrap: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: "rgba(11,18,32,0.72)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  header: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: 16,
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 0.4,
    opacity: 0.8,
    color: "rgba(255,255,255,0.78)",
    fontWeight: 900,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 22,
    fontWeight: 950,
    color: "white",
    marginTop: 2,
  },
  sub: {
    marginTop: 6,
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
  },

  // ⬇️ agora 4 colunas (token / buscar / buscar número / status)
  controlsRow: {
    display: "grid",
    gridTemplateColumns: "1.1fr 1fr 0.8fr 0.7fr",
    gap: 12,
    marginTop: 14,
  },
  control: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 14,
    padding: 12,
  },
  label: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    fontWeight: 900,
  },
  input: {
    marginTop: 8,
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    outline: "none",
  },
  errorBox: {
    marginTop: 12,
    borderRadius: 14,
    padding: 12,
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.28)",
    color: "white",
  },
  content: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: 16,
  },
  grid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    alignItems: "stretch",
  },
  card: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04))",
    boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    minHeight: 250,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  badge: {
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 950,
    fontSize: 12,
    whiteSpace: "nowrap",
    border: "1px solid rgba(255,255,255,0.18)",
  },
  cardMetaLabel: {
    fontSize: 12,
    fontWeight: 900,
    color: "rgba(255,255,255,0.70)",
  },
  buyerName: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: 950,
    color: "white",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 280,
  },
  buyerSub: {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(255,255,255,0.62)",
  },
  numsWrap: {
    marginTop: 10,
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  numChip: {
    height: 28,
    display: "inline-flex",
    alignItems: "center",
    padding: "0 10px",
    borderRadius: 999,
    background: "rgba(17,24,39,0.6)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "white",
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: 900,
  },
  moreChip: {
    height: 28,
    display: "inline-flex",
    alignItems: "center",
    padding: "0 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px dashed rgba(255,255,255,0.18)",
    color: "rgba(255,255,255,0.88)",
    fontSize: 12,
    fontWeight: 900,
  },
  cardFooterTop: {
    marginTop: 14,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-end",
  },
  total: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: 950,
    color: "white",
  },
  monoId: {
    marginTop: 4,
    fontFamily: "monospace",
    fontSize: 11,
    color: "rgba(255,255,255,0.68)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 180,
  },
  actions: {
    marginTop: "auto",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    paddingTop: 14,
  },
  smallNote: {
    marginTop: 10,
    fontSize: 12,
    color: "rgba(255,255,255,0.60)",
  },
};

function btnPrimary(disabled) {
  return {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: disabled ? "rgba(156,163,175,0.25)" : "rgba(255,255,255,0.10)",
    color: "white",
    fontWeight: 950,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function btnGhost() {
  return {
    padding: "8px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  };
}

function btnAction(bg) {
  return {
    height: 40,
    borderRadius: 14,
    border: "none",
    background: bg,
    color: "white",
    fontWeight: 950,
    cursor: bg === "#9ca3af" ? "not-allowed" : "pointer",
  };
}
