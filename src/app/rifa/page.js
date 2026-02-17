"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabasePublic } from "@/lib/supabasePublic";
import Image from "next/image";
import LoadingScreen from "@/components/LoadingScreen";
import { IoDocumentText } from "react-icons/io5";
import { FiArrowUp } from "react-icons/fi";

function pad4(n) {
  return String(n).padStart(4, "0");
}

const CHECKOUT_KEY = "checkout_active_raffle";

export default function RifaPage() {
  const router = useRouter();

  const [raffle, setRaffle] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [buyerModalOpen, setBuyerModalOpen] = useState(false);
  const [buyerModalLoading, setBuyerModalLoading] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerTicketNumber, setBuyerTicketNumber] = useState(null);

  const [hasSavedCheckout, setHasSavedCheckout] = useState(false);

  const [showTopBtn, setShowTopBtn] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");

    const apply = () => setIsMobile(mq.matches);
    apply();

    // compatível com browsers antigos
    if (mq.addEventListener) mq.addEventListener("change", apply);
    else mq.addListener(apply);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", apply);
      else mq.removeListener(apply);
    };
  }, []);

  useEffect(() => {
    function handleScroll() {
      setShowTopBtn(window.scrollY > 300); // aparece após 300px
    }

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMsg("");
      try {
        const r = await fetch("/api/raffles/active");
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || "Erro ao buscar rifa ativa");
        setRaffle(d.raffle);
        const r2 = await fetch(`/api/raffles/${d.raffle.id}/tickets`);
        const d2 = await r2.json();
        if (!r2.ok) throw new Error(d2?.error || "Erro ao buscar tickets");
        setTickets(d2.tickets || []);
      } catch (e) {
        setErrorMsg(e.message || "Erro");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!raffle?.id) return;
    const channel = supabasePublic
      .channel(`raffle:${raffle.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: `raffle_id=eq.${raffle.id}`,
        },
        (payload) => {
          const newRow = payload.new;
          const oldRow = payload.old;
          setTickets((prev) => {
            if (!newRow && oldRow)
              return prev.filter((t) => t.id !== oldRow.id);
            if (newRow && !oldRow) {
              if (prev.some((t) => t.id === newRow.id)) return prev;
              return [...prev, newRow].sort((a, b) => a.number - b.number);
            }
            if (newRow)
              return prev.map((t) => (t.id === newRow.id ? newRow : t));
            return prev;
          });
          if (newRow && newRow.status !== "available") {
            setSelected((prevSel) =>
              prevSel.filter((n) => n !== newRow.number),
            );
          }
        },
      )
      .subscribe();
    return () => {
      supabasePublic.removeChannel(channel);
    };
  }, [raffle?.id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHECKOUT_KEY);
      if (!raw) {
        setHasSavedCheckout(false);
        return;
      }
      const parsed = JSON.parse(raw);
      const nums = Array.isArray(parsed?.ticketNumbers)
        ? parsed.ticketNumbers
        : [];
      setHasSavedCheckout(nums.length > 0);
      if (nums.length > 0) setSelected(nums.slice().sort((a, b) => a - b));
    } catch {
      setHasSavedCheckout(false);
    }
  }, []);

  const counts = useMemo(() => {
    const total = tickets.length;
    const available = tickets.filter((t) => t.status === "available").length;
    const reserved = tickets.filter((t) => t.status === "reserved").length;
    const paid = tickets.filter((t) => t.status === "paid").length;
    return { total, available, reserved, paid };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    if (filter === "all") return tickets;
    return tickets.filter((t) => t.status === filter);
  }, [tickets, filter]);

  const totalCents = useMemo(() => {
    if (!raffle) return 0;
    return selected.length * raffle.ticket_price_cents;
  }, [selected, raffle]);

  function toggleTicket(t) {
    if (t.status !== "available") return;
    setSelected((prev) => {
      const exists = prev.includes(t.number);
      if (exists) return prev.filter((n) => n !== t.number);
      return [...prev, t.number].sort((a, b) => a - b);
    });
  }

  function removeSelectedNumber(n) {
    setSelected((prev) => prev.filter((x) => x !== n));
  }
  function clearSelected() {
    setSelected([]);
  }

  function participar() {
    if (!selected.length) return;
    setCreating(true);
    setErrorMsg("");
    try {
      localStorage.setItem(
        CHECKOUT_KEY,
        JSON.stringify({ ticketNumbers: selected, createdAt: Date.now() }),
      );
      setHasSavedCheckout(true);
      router.push("/checkout");
    } catch {
      setErrorMsg("Não foi possível salvar sua seleção. Tente novamente.");
    } finally {
      setCreating(false);
    }
  }

  function continueCheckout() {
    router.push("/checkout");
  }
  function forgetCheckout() {
    try {
      localStorage.removeItem(CHECKOUT_KEY);
    } catch {}
    setHasSavedCheckout(false);
  }

  function ticketVisual(status, isSelected) {
    const base = {
      border: "1px solid #1a1a1a",
      background: "#050505",
      color: "#444",
    };
    if (status === "paid")
      return {
        ...base,
        border: "1px solid #065f46",
        background: "#064e3b44",
        color: "#10b981",
      };
    if (status === "reserved")
      return {
        ...base,
        border: "1px solid #92400e",
        background: "#78350f44",
        color: "#f59e0b",
      };
    if (isSelected)
      return {
        ...base,
        border: "1px solid #fff",
        background: "#fff",
        color: "#000",
      };
    return base;
  }

  async function handleTicketClick(t) {
    if (t.status === "available") {
      toggleTicket(t);
      return;
    }
    if (t.status === "paid") {
      setBuyerModalOpen(true);
      setBuyerModalLoading(true);
      setBuyerName("");
      setBuyerTicketNumber(t.number);
      try {
        const res = await fetch(`/api/tickets/${t.id}/buyer`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erro ao buscar comprador");
        setBuyerName(data?.buyer_name || "Comprador não informado");
      } catch (e) {
        setBuyerName(e.message || "Erro");
      } finally {
        setBuyerModalLoading(false);
      }
      return;
    }
    if (t.status === "reserved") {
      setErrorMsg("Esse número está reservado.");
      setTimeout(() => setErrorMsg(""), 2200);
      return;
    }
  }

  if (loading) return <LoadingScreen label="Carregando rifa..." />;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.top}>
          <div style={{ flex: 1 }}>
            <div style={styles.kicker}>{raffle.title}</div>
            <div style={{ marginTop: 14 }}>
              <Image
                src="/logo-idba.png"
                alt="Logo"
                width={110}
                height={55}
                priority
                style={{ objectFit: "contain" }}
              />
            </div>
            <div style={styles.sub}>
              Preço:{" "}
              <span style={styles.price}>
                R$ {(raffle.ticket_price_cents / 100).toFixed(2)}
              </span>
            </div>

            {/* Link do Regulamento adicionado aqui */}
            <a
              href="https://idba.framer.website"
              target="_blank"
              style={styles.rulesLink}
            >
              <IoDocumentText size={16} />
              <span>Prêmio / Regulamento</span>
            </a>
          </div>
          <button
            onClick={() => router.push("/meus-tickets")}
            style={styles.ghostBtn}
          >
            Meus Tickets
          </button>
        </header>

        {hasSavedCheckout && (
          <div style={styles.banner}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "700", color: "#fff", fontSize: 13 }}>
                Carrinho pendente
              </div>
              <div style={{ opacity: 0.5, fontSize: 11 }}>
                Deseja continuar de onde parou?
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={continueCheckout} style={styles.primaryBtn}>
                Sim
              </button>
              <button onClick={forgetCheckout} style={styles.ghostBtn}>
                Não
              </button>
            </div>
          </div>
        )}

        {errorMsg ? (
          <div style={styles.toastWrap}>
            <div style={styles.toast}>{errorMsg}</div>
          </div>
        ) : null}

        <div style={styles.filterSection}>
          <div style={styles.filters}>
            <FilterBtn
              active={filter === "all"}
              label="Todos"
              value={counts.total}
              onClick={() => setFilter("all")}
            />
            <FilterBtn
              active={filter === "available"}
              label="Livres"
              value={counts.available}
              onClick={() => setFilter("available")}
            />
            <FilterBtn
              active={filter === "reserved"}
              label="Reserva"
              value={counts.reserved}
              onClick={() => setFilter("reserved")}
            />
            <FilterBtn
              active={filter === "paid"}
              label="Pagos"
              value={counts.paid}
              onClick={() => setFilter("paid")}
            />
          </div>
        </div>

        <div style={styles.grid}>
          {filteredTickets.map((t) => {
            const isSelected = selected.includes(t.number);
            const v = ticketVisual(t.status, isSelected);
            return (
              <button
                key={t.id}
                onClick={() => handleTicketClick(t)}
                style={{ ...styles.ticketBtn, ...v }}
              >
                <div style={styles.ticketNum}>{pad4(t.number)}</div>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    marginTop: 2,
                    opacity: 0.6,
                  }}
                >
                  {t.status === "paid"
                    ? "PAGO"
                    : t.status === "reserved"
                      ? "RES"
                      : "INFO"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected.length > 0 && (
        <div style={styles.bottomBar}>
          <div style={styles.bottomInner}>
            <div style={styles.selectionArea}>
              <div style={styles.selectionHeader}>
                <span style={{ fontWeight: 800, fontSize: 12 }}>
                  {selected.length} Selecionados
                </span>
                <button onClick={clearSelected} style={styles.clearBtn}>
                  Remover tudo
                </button>
              </div>

              <div style={styles.chipsScroll}>
                {selected.map((n) => (
                  <span key={n} style={styles.chip}>
                    {pad4(n)}
                    <button
                      onClick={() => removeSelectedNumber(n)}
                      style={styles.chipX}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div style={styles.actionArea}>
              <div style={styles.totalValue}>
                R$ {(totalCents / 100).toFixed(2)}
              </div>
              <button
                onClick={participar}
                disabled={creating}
                style={styles.cta}
              >
                {creating ? "..." : "Participar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTopBtn && (
        <button
          onClick={scrollToTop}
          style={{
            ...styles.scrollTopBtn,
            bottom: isMobile && selected.length > 0 ? 200 : 16, // ✅ só muda no mobile
          }}
          aria-label="Voltar ao topo"
        >
          <FiArrowUp size={20} />
        </button>
      )}

      {buyerModalOpen && (
        <div
          onClick={() => setBuyerModalOpen(false)}
          style={styles.modalOverlay}
        >
          <div onClick={(e) => e.stopPropagation()} style={styles.modal}>
            <div style={styles.modalHeader}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                Número {pad4(buyerTicketNumber)}
              </span>
              <button
                onClick={() => setBuyerModalOpen(false)}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            <div style={{ marginTop: 16 }}>
              {buyerModalLoading ? (
                <div className="spinner-small" />
              ) : (
                <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>
                  {buyerName}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .spinner-small {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        /* Custom Scrollbar */
        ::-webkit-scrollbar {
          height: 4px;
          width: 4px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}

function FilterBtn({ label, value, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ ...styles.filterBtn, ...(active ? styles.filterBtnActive : {}) }}
    >
      {label} <span style={{ opacity: 0.4, marginLeft: 4 }}>{value}</span>
    </button>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#000",
    color: "#fff",
    fontFamily: "sans-serif",
  },
  container: {
    maxWidth: 650,
    margin: "0 auto",
    padding: "24px 16px 160px 16px",
  },
  loadingPage: {
    minHeight: "100vh",
    background: "#000",
    display: "grid",
    placeItems: "center",
  },

  top: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
  },
  kicker: {
    fontSize: 11,
    fontWeight: 800,
    opacity: 0.4,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  sub: { marginTop: 14, fontSize: 13, color: "#666" },
  price: { color: "#fff", fontWeight: 800, marginLeft: 4 },

  ghostBtn: {
    background: "#111",
    border: "1px solid #222",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  primaryBtn: {
    background: "#fff",
    border: "none",
    color: "#000",
    padding: "10px 16px",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },

  banner: {
    background: "#0a0a0a",
    border: "1px solid #222",
    padding: 14,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    marginBottom: 20,
  },
  errorBox: {
    marginBottom: 20,
    background: "#1a0000",
    color: "#ff4444",
    padding: 12,
    borderRadius: 12,
    fontSize: 12,
    border: "1px solid #440000",
    fontWeight: 600,
  },

  filterSection: { marginBottom: 24 },
  filters: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    paddingBottom: 10,
    WebkitOverflowScrolling: "touch",
  },
  filterBtn: {
    flexShrink: 0,
    background: "#000",
    border: "1px solid #222",
    color: "#888",
    padding: "8px 16px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  filterBtnActive: {
    border: "1px solid #fff",
    color: "#fff",
    background: "#111",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(75px, 1fr))",
    gap: 10,
  },
  ticketBtn: {
    aspectRatio: "1/1",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    cursor: "pointer",
    transition: "0.15s ease",
    outline: "none",
  },
  ticketNum: {
    fontSize: 16,
    fontWeight: 800,
    fontFamily: "monospace",
    letterSpacing: -0.5,
  },

  // --- BOTÃO DE SELECIONADOS ---
  bottomBar: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "16px",
    background: "linear-gradient(to top, #000 70%, transparent)",
    zIndex: 50,
  },
  bottomInner: {
    maxWidth: 600,
    margin: "0 auto",
    background: "#111",
    border: "1px solid #333",
    borderRadius: 24,
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
  },
  selectionArea: { minWidth: 0 },
  selectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  clearBtn: {
    background: "none",
    border: "none",
    color: "#f87171",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    padding: 0,
  },

  chipsScroll: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    paddingBottom: 4,
    scrollBehavior: "smooth",
  },
  chip: {
    flexShrink: 0,
    background: "#000",
    border: "1px solid #333",
    padding: "6px 10px",
    borderRadius: 10,
    fontSize: 12,
    fontFamily: "monospace",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  chipX: {
    background: "#222",
    border: "none",
    color: "#fff",
    width: 18,
    height: 18,
    borderRadius: 5,
    fontSize: 12,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
  },

  actionArea: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid #222",
    paddingTop: 14,
  },
  totalValue: { fontSize: 20, fontWeight: 900, letterSpacing: -0.5 },
  cta: {
    background: "#fff",
    color: "#000",
    border: "none",
    padding: "12px 28px",
    borderRadius: 14,
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 14,
  },

  // --- MODAL ---
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.9)",
    backdropFilter: "blur(8px)",
    display: "grid",
    placeItems: "center",
    zIndex: 100,
    padding: 20,
  },
  modal: {
    background: "#0a0a0a",
    border: "1px solid #222",
    padding: 24,
    borderRadius: 30,
    width: "100%",
    maxWidth: 350,
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalClose: {
    background: "#1a1a1a",
    border: "none",
    color: "#fff",
    width: 32,
    height: 32,
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 18,
  },
  rulesLink: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    fontSize: 12,
    fontWeight: 600,
    color: "#888",
    textDecoration: "none",
    transition: "color 0.2s",
    cursor: "pointer",
  },
  toastWrap: {
    position: "fixed",
    left: 0,
    right: 0,
    top: 12,
    zIndex: 9999,
    display: "flex",
    justifyContent: "center",
    padding: "0 12px",
    pointerEvents: "none", // não atrapalha clique nos tickets
  },
  toast: {
    pointerEvents: "auto",
    background: "rgba(26,0,0,0.92)",
    border: "1px solid rgba(255,68,68,0.55)",
    color: "#ffb4b4",
    padding: "12px 14px",
    borderRadius: 14,
    fontSize: 12,
    fontWeight: 800,
    maxWidth: 520,
    width: "100%",
    boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
  },
  scrollTopBtn: {
    position: "fixed",
    right: 16,
    width: 40,
    height: 40,
    fontSize: 12,
    borderRadius: "50%",
    border: "1px solid #222",
    background: "#111",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 80,
    boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
    transition: "all 0.2s ease",
  },
};
