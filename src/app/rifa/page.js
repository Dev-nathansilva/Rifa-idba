"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabasePublic } from "@/lib/supabasePublic";

function pad4(n) {
  return String(n).padStart(4, "0");
}

const CHECKOUT_KEY = "checkout_active_raffle";

export default function RifaPage() {
  const router = useRouter();

  const [raffle, setRaffle] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState([]);
  const [filter, setFilter] = useState("all"); // all | available | reserved | paid
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // modal (quem comprou)
  const [buyerModalOpen, setBuyerModalOpen] = useState(false);
  const [buyerModalLoading, setBuyerModalLoading] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerTicketNumber, setBuyerTicketNumber] = useState(null);

  // aviso de checkout pendente (seleção salva)
  const [hasSavedCheckout, setHasSavedCheckout] = useState(false);

  // carregar rifa ativa + tickets
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

  // realtime (só quando raffle existir)
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

  // carregar seleção salva
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

  // agora só salva a seleção e vai pro checkout (sem raffleId)
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

  function statusStyle(status, isSelected) {
    if (status === "paid")
      return { background: "#16a34a", color: "white", opacity: 0.95 };
    if (status === "reserved")
      return { background: "#f59e0b", color: "black", opacity: 0.95 };
    if (isSelected) return { background: "#111827", color: "white" };
    return { background: "#f3f4f6", color: "#111827" };
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
      alert("Esse número está reservado no momento.");
      return;
    }
  }

  if (loading) return <p style={{ padding: 20 }}>Carregando rifa...</p>;

  if (!raffle) {
    return (
      <div style={{ padding: 20 }}>
        <p>{errorMsg || "Nenhuma rifa ativa."}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      {/* topo */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ marginBottom: 6 }}>{raffle.title}</h1>
          <p style={{ marginTop: 0, opacity: 0.8 }}>
            Preço por número:{" "}
            <b>R$ {(raffle.ticket_price_cents / 100).toFixed(2)}</b>
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => router.push("/meus-tickets")}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "white",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Ver meus tickets
          </button>
        </div>
      </div>

      {/* banner: checkout pendente */}
      {hasSavedCheckout && (
        <div
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "#f8fafc",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <b>Você tem uma seleção salva</b>
            <div style={{ opacity: 0.7, fontSize: 13 }}>
              Você pode continuar do checkout para preencher seus dados.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={continueCheckout}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "none",
                background: "#111827",
                color: "white",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Continuar checkout
            </button>

            <button
              onClick={forgetCheckout}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "white",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Esquecer
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            background: "#fee2e2",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
            marginTop: 12,
          }}
        >
          <b>Erro:</b> {errorMsg}
        </div>
      )}

      {/* filtros */}
      <div
        style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "12px 0" }}
      >
        <FilterBtn
          active={filter === "all"}
          label="Todos"
          value={counts.total}
          onClick={() => setFilter("all")}
        />
        <FilterBtn
          active={filter === "available"}
          label="Disponíveis"
          value={counts.available}
          onClick={() => setFilter("available")}
        />
        <FilterBtn
          active={filter === "reserved"}
          label="Reservados"
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

      {/* grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 10,
          marginTop: 10,
        }}
      >
        {filteredTickets.map((t) => {
          const isSelected = selected.includes(t.number);
          const style = statusStyle(t.status, isSelected);

          return (
            <button
              key={t.id}
              onClick={() => handleTicketClick(t)}
              style={{
                padding: 14,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.08)",
                cursor: "pointer",
                opacity: t.status === "available" ? 1 : 0.95,
                ...style,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {pad4(t.number)}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                {t.status === "available"
                  ? "Disponível"
                  : t.status === "reserved"
                    ? "Reservado"
                    : "Pago"}
              </div>
            </button>
          );
        })}
      </div>

      {/* barra selecionados */}
      <div
        style={{
          marginTop: 18,
          padding: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 10,
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
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <b>Selecionados ({selected.length})</b>

              <button
                onClick={clearSelected}
                disabled={selected.length === 0}
                style={{
                  padding: "6px 10px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: selected.length === 0 ? "#f3f4f6" : "white",
                  cursor: selected.length === 0 ? "not-allowed" : "pointer",
                  fontWeight: 800,
                }}
              >
                Remover tudo
              </button>
            </div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {selected.length === 0 ? (
                <span style={{ opacity: 0.7 }}>Nenhum número selecionado</span>
              ) : (
                selected.map((n) => (
                  <span
                    key={n}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "#111827",
                      color: "white",
                      padding: "6px 10px",
                      borderRadius: 999,
                    }}
                  >
                    {pad4(n)}
                    <button
                      onClick={() => removeSelectedNumber(n)}
                      style={{
                        border: "none",
                        background: "rgba(255,255,255,0.2)",
                        color: "white",
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        cursor: "pointer",
                        fontWeight: 900,
                        lineHeight: "22px",
                      }}
                      title={`Remover ${pad4(n)}`}
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ opacity: 0.7 }}>Total</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>
              R$ {(totalCents / 100).toFixed(2)}
            </div>
            <button
              onClick={participar}
              disabled={selected.length === 0 || creating}
              style={{
                marginTop: 10,
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                background:
                  selected.length === 0 || creating ? "#9ca3af" : "#111827",
                color: "white",
                cursor:
                  selected.length === 0 || creating ? "not-allowed" : "pointer",
                fontWeight: 900,
              }}
            >
              {creating ? "Indo pro checkout..." : "Participar"}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {buyerModalOpen && (
        <div
          onClick={() => setBuyerModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              background: "white",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
              }}
            >
              <b>
                Comprador do número{" "}
                {buyerTicketNumber !== null ? pad4(buyerTicketNumber) : ""}
              </b>
              <button
                onClick={() => setBuyerModalOpen(false)}
                style={{
                  border: "none",
                  background: "#f3f4f6",
                  borderRadius: 10,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                Fechar
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              {buyerModalLoading ? (
                <p>Buscando...</p>
              ) : (
                <p style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>
                  {buyerName}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterBtn({ label, value, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 999,
        padding: "8px 12px",
        cursor: "pointer",
        background: active ? "#111827" : "white",
        color: active ? "white" : "#111827",
        fontWeight: 800,
      }}
    >
      <span style={{ opacity: active ? 1 : 0.7 }}>{label}:</span>{" "}
      <span>{value}</span>
    </button>
  );
}
