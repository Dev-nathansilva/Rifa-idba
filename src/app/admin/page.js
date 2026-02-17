"use client";

import { useEffect, useMemo, useState } from "react";
import { FiFilter, FiRefreshCw, FiX, FiChevronDown } from "react-icons/fi";
import { FiTrash2 } from "react-icons/fi";
import LoadingScreen from "@/components/LoadingScreen";

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
  if (status === "pending_payment") return { bg: "#1e293b", fg: "#fff" };
  if (status === "canceled") return { bg: "#ef4444", fg: "#fff" };
  return { bg: "#f59e0b", fg: "#111827" };
}
function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

function maskPhone(value) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const DEFAULT_FILTERS = {
  q: "",
  ticketQ: "",
  status: "all",
  phone: "",
};

export default function AdminOrdersPage() {
  // auth
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [authOk, setAuthOk] = useState(false);

  // data
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // filters (aplicado vs rascunho)
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);

  // session boot
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch("/api/admin/me");
        if (!alive) return;

        if (res.ok) {
          setAuthOk(true);
          await load(); // carrega pedidos
        } else {
          setAuthOk(false);
        }
      } catch {
        if (alive) setAuthOk(false);
      } finally {
        if (alive) setCheckingSession(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login() {
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user, pass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Erro no login");
      setAuthOk(true);
      await load();
    } catch (e) {
      setAuthOk(false);
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      setAuthOk(false);
      setOrders([]);
      setUser("");
      setPass("");
      setErrorMsg("");

      // ✅ reseta filtros SEM quebrar o shape (inclui phone)
      setFilters(DEFAULT_FILTERS);
      setDraftFilters(DEFAULT_FILTERS);
      setShowFilters(false);

      setLoading(false);
    }
  }

  async function load() {
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders?limit=2000");
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setAuthOk(false);
        throw new Error("Não autorizado");
      }

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
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setAuthOk(false);
        throw new Error("Não autorizado");
      }

      if (!res.ok) throw new Error(data?.error || "Erro ao aprovar");
      await load();
    } catch (e) {
      alert(e.message || "Erro ao aprovar");
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
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setAuthOk(false);
        throw new Error("Não autorizado");
      }

      if (!res.ok) throw new Error(data?.error || "Erro ao cancelar");
      await load();
    } catch (e) {
      alert(e.message || "Erro ao cancelar");
    } finally {
      setActingId(null);
    }
  }

  async function removeOrder(orderId) {
    const password = prompt("Digite a senha para apagar o pedido:");

    if (!password) return;

    if (
      !confirm(
        "Isso irá apagar permanentemente o pedido e liberar os números. Confirmar?",
      )
    )
      return;

    setActingId(orderId);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/delete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || "Erro ao apagar");

      await load();
    } catch (e) {
      alert(e.message);
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

    // ✅ blindado contra undefined
    const query = String(filters?.q || "")
      .trim()
      .toLowerCase();

    const ticketStr = String(filters?.ticketQ || "").trim();
    const tNum = ticketStr.length ? Number(onlyDigits(ticketStr)) : null;

    const status = String(filters?.status || "all");
    const phoneStr = String(filters?.phone || "").trim();
    const phoneDigits = onlyDigits(phoneStr);

    if (status !== "all")
      filtered = filtered.filter((o) => o.status === status);

    if (tNum !== null)
      filtered = filtered.filter((o) => o.numbers.includes(tNum));

    // telefone separado (robusto: compara só dígitos)
    if (phoneDigits) {
      filtered = filtered.filter((o) =>
        onlyDigits(o.buyer_phone).includes(phoneDigits),
      );
    }

    // busca geral (sem telefone pra evitar confusão)
    if (query) {
      filtered = filtered.filter((o) =>
        [o.buyer_name, o.buyer_email, o.buyer_document].some((f) =>
          String(f || "")
            .toLowerCase()
            .includes(query),
        ),
      );
    }

    return filtered.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );
  }, [orders, filters]);

  if (checkingSession) {
    return <LoadingScreen label="Carregando admin" />;
  }

  // ---------- UI ----------
  if (!authOk) {
    return (
      <div style={styles.page}>
        <div
          style={{
            maxWidth: 420,
            margin: "0 auto",
            padding: 24,
            paddingTop: 80,
          }}
        >
          <h2 style={{ margin: 0, fontWeight: 900 }}>Admin</h2>
          <p style={{ opacity: 0.6, marginTop: 8 }}>
            Entre para visualizar e gerenciar pedidos.
          </p>

          {errorMsg ? (
            <div
              style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.35)",
                padding: 12,
                borderRadius: 12,
                marginTop: 12,
              }}
            >
              <div style={{ fontWeight: 800 }}>Erro</div>
              <div style={{ opacity: 0.8, marginTop: 4 }}>{errorMsg}</div>
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 16,
            }}
          >
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Usuário"
              style={styles.input}
              autoComplete="username"
            />
            <input
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Senha"
              type="password"
              style={styles.input}
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === "Enter") login();
              }}
            />
            <button onClick={login} disabled={loading} style={styles.applyBtn}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.headerWrap}>
        <div style={styles.headerContent}>
          <div style={styles.navMain}>
            <div style={styles.tokenArea}>
              <button onClick={load} disabled={loading} style={styles.syncBtn}>
                <FiRefreshCw className={loading ? "spin" : ""} />
                <span className="hide-mobile" style={{ marginLeft: 8 }}>
                  Sincronizar
                </span>
              </button>

              <button
                onClick={logout}
                disabled={loading}
                style={{
                  ...styles.filterToggle,
                  background: "#0b1220",
                }}
              >
                Sair
              </button>
            </div>

            <button
              onClick={() => {
                setDraftFilters({ ...DEFAULT_FILTERS, ...filters }); // ✅ garante shape
                setShowFilters(true);
              }}
              style={styles.filterToggle}
            >
              <FiFilter /> Filtros {rows.length > 0 && `(${rows.length})`}
            </button>
          </div>

          {errorMsg ? (
            <div style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>
              {errorMsg}
            </div>
          ) : null}
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
                value={draftFilters.q}
                onChange={(e) =>
                  setDraftFilters((p) => ({ ...p, q: e.target.value }))
                }
                placeholder="Nome, CPF ou E-mail"
                style={styles.input}
              />

              <input
                value={draftFilters.phone}
                onChange={(e) =>
                  setDraftFilters((p) => ({
                    ...p,
                    phone: maskPhone(e.target.value),
                  }))
                }
                placeholder="Telefone"
                style={styles.input}
              />

              <input
                value={draftFilters.ticketQ}
                onChange={(e) =>
                  setDraftFilters((p) => ({ ...p, ticketQ: e.target.value }))
                }
                placeholder="Número do Ticket"
                style={styles.input}
              />

              <div style={styles.selectWrapper}>
                <select
                  value={draftFilters.status}
                  onChange={(e) =>
                    setDraftFilters((p) => ({ ...p, status: e.target.value }))
                  }
                  style={styles.select}
                >
                  <option value="all">Todos os Status</option>
                  <option value="pending_payment">Aguardando</option>
                  <option value="paid">Pago</option>
                  <option value="canceled">Cancelado</option>
                </select>
                <FiChevronDown style={styles.selectIcon} />
              </div>

              <button
                onClick={() => {
                  setFilters({ ...DEFAULT_FILTERS, ...draftFilters }); // ✅ garante shape
                  setShowFilters(false);
                }}
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

                  <button
                    onClick={() => removeOrder(o.id)}
                    disabled={busy}
                    className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold text-white bg-gray-600 hover:bg-red-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <FiTrash2 size={16} />
                    APAGAR
                  </button>
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
  tokenArea: { display: "flex", gap: 8, flex: 1 },

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
    gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
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

  selectWrapper: {
    position: "relative",
  },

  select: {
    width: "100%",
    background: "#060a13",
    border: "1px solid #1e293b",
    padding: "14px 44px 14px 14px",
    borderRadius: 12,
    color: "#fff",
    outline: "none",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    cursor: "pointer",
  },

  selectIcon: {
    position: "absolute",
    right: 14,
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    color: "#94a3b8",
    fontSize: 18,
  },
};
