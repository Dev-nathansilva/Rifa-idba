"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";

function pad4(n) {
  return String(n).padStart(4, "0");
}

function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

function money(cents) {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

function formatPhoneBR(value) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatCPF(value) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function isValidEmail(email) {
  const s = String(email || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

function normalizeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ");
}

function isFullName(name) {
  const s = normalizeName(name);
  const parts = s.split(" ").filter(Boolean);
  if (parts.length < 2) return false;
  return parts.every((p) => /^[A-Za-zÀ-ÖØ-öø-ÿ]{2,}$/.test(p));
}

function isValidCPF(cpf) {
  const c = onlyDigits(cpf);
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;

  const calc = (base, factor) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += Number(base[i]) * (factor - i);
    }
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const d1 = calc(c.slice(0, 9), 10);
  const d2 = calc(c.slice(0, 9) + String(d1), 11);
  return c.endsWith(`${d1}${d2}`);
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

  // validação: mensagens por campo
  const [touched, setTouched] = useState({
    buyer_name: false,
    buyer_phone: false,
    buyer_email: false,
    buyer_document: false,
  });

  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMsg("");

      const startTime = Date.now();

      let saved = null;
      try {
        saved = JSON.parse(localStorage.getItem(CHECKOUT_KEY) || "null");
      } catch {
        saved = null;
      }

      const nums = Array.isArray(saved?.ticketNumbers)
        ? saved.ticketNumbers
        : [];

      if (nums.length === 0) {
        router.replace("/rifa");
        return;
      }

      setTicketNumbers(nums.slice().sort((a, b) => a - b));

      try {
        const r = await fetch("/api/raffles/active");
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || "Erro ao buscar rifa ativa");
        setRaffle(d.raffle);
      } catch (e) {
        setErrorMsg(e.message || "Erro");
      } finally {
        const elapsed = Date.now() - startTime;
        const remaining = 1500 - elapsed;
        setTimeout(() => setLoading(false), remaining > 0 ? remaining : 0);
      }
    }

    load();
  }, [router]);

  const totalCents = useMemo(() => {
    if (!raffle) return 0;
    return ticketNumbers.length * raffle.ticket_price_cents;
  }, [raffle, ticketNumbers]);

  // ======= VALIDADORES + MENSAGENS =======

  const nameError = useMemo(() => {
    const v = normalizeName(form.buyer_name);
    if (!v) return "Preencha seu nome completo.";
    if (v.length < 5)
      return "Seu nome parece muito curto. Digite nome e sobrenome.";
    if (!isFullName(v))
      return "Digite seu nome e sobrenome (ex: João da Silva).";
    return "";
  }, [form.buyer_name]);

  const phoneError = useMemo(() => {
    const d = onlyDigits(form.buyer_phone);
    if (!d) return "Preencha o seu telefone.";
    if (!(d.length === 10 || d.length === 11))
      return "Número inválido. Use DDD + número (ex: (85) 99999-8888).";
    // regra simples: DDD não pode começar com 0
    if (d.length >= 2 && d[0] === "0") return "DDD inválido.";
    return "";
  }, [form.buyer_phone]);

  const emailError = useMemo(() => {
    const v = String(form.buyer_email || "").trim();
    if (!v) return "Preencha seu e-mail.";
    if (!isValidEmail(v)) return "E-mail inválido. Ex: joao@email.com";
    return "";
  }, [form.buyer_email]);

  const cpfError = useMemo(() => {
    const d = onlyDigits(form.buyer_document);
    if (!d) return "Preencha seu CPF.";
    if (d.length < 11) return "CPF incompleto. Digite os 11 números.";
    if (!isValidCPF(d)) return "CPF inválido. Confira e tente novamente.";
    return "";
  }, [form.buyer_document]);

  const canContinue = useMemo(() => {
    return (
      !nameError &&
      !phoneError &&
      !emailError &&
      !cpfError &&
      ticketNumbers.length > 0 &&
      !!raffle &&
      !saving
    );
  }, [
    nameError,
    phoneError,
    emailError,
    cpfError,
    ticketNumbers.length,
    raffle,
    saving,
  ]);

  function onChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function onBlur(field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function showFieldError(field, msg) {
    return msg && (touched[field] || submitAttempted);
  }

  function goBackToRaffle() {
    router.push("/rifa");
  }

  async function continuarParaPagamento() {
    setSubmitAttempted(true);

    // marca tudo como touched para mostrar mensagens
    setTouched({
      buyer_name: true,
      buyer_phone: true,
      buyer_email: true,
      buyer_document: true,
    });

    if (!canContinue) return;

    setSaving(true);
    setErrorMsg("");

    console.log(
      "ENVIANDO buyer_phone:",
      form.buyer_phone,
      "digits:",
      onlyDigits(form.buyer_phone),
    );
    console.log(
      "ENVIANDO buyer_document:",
      form.buyer_document,
      "digits:",
      onlyDigits(form.buyer_document),
    );

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raffleId: raffle.id,
          ticketNumbers,
          buyer: {
            buyer_name: normalizeName(form.buyer_name),
            buyer_phone: form.buyer_phone.trim(),
            buyer_email: form.buyer_email.trim(),
            buyer_document: form.buyer_document.trim(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || "Não foi possível reservar os números");

      localStorage.removeItem(CHECKOUT_KEY);
      router.push(`/pagar/${data.orderId}`);
    } catch (e) {
      setErrorMsg(e.message || "Erro");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <div style={styles.page}>
      <div style={styles.container} className="checkout-container">
        <header style={styles.header} className="checkout-header">
          <div>
            <div className="text-center md:text-start" style={styles.kicker}>
              Quase lá
            </div>
            <h1 style={styles.title}>Finalizar pedido</h1>
          </div>
          <button onClick={goBackToRaffle} style={styles.ghostBtn}>
            Voltar
          </button>
        </header>

        {errorMsg && (
          <div style={styles.errorBox}>
            <b>Erro:</b> {errorMsg}
          </div>
        )}

        <div style={styles.contentGrid} className="checkout-grid">
          {/* Formulário */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Seus dados</h2>

            <Field label="Nome completo *">
              <input
                value={form.buyer_name}
                onChange={(e) => onChange("buyer_name", e.target.value)}
                onBlur={() => onBlur("buyer_name")}
                placeholder="Ex: João da Silva"
                style={{
                  ...styles.input,
                  ...(showFieldError("buyer_name", nameError)
                    ? styles.inputError
                    : null),
                }}
                autoComplete="name"
              />
              {showFieldError("buyer_name", nameError) && (
                <div style={styles.fieldError}>{nameError}</div>
              )}
            </Field>

            <Field label="DDD + Telefone *">
              <input
                value={form.buyer_phone}
                onChange={(e) =>
                  onChange("buyer_phone", formatPhoneBR(e.target.value))
                }
                onBlur={() => onBlur("buyer_phone")}
                placeholder="Ex: (85) 99999-8888"
                inputMode="tel"
                autoComplete="tel"
                style={{
                  ...styles.input,
                  ...(showFieldError("buyer_phone", phoneError)
                    ? styles.inputError
                    : null),
                }}
              />
              {showFieldError("buyer_phone", phoneError) ? (
                <div style={styles.fieldError}>{phoneError}</div>
              ) : (
                <div style={styles.inputHint}>
                  Para você consultar seus tickets depois.
                </div>
              )}
            </Field>

            <Field label="E-mail *">
              <input
                value={form.buyer_email}
                onChange={(e) => onChange("buyer_email", e.target.value)}
                onBlur={() => onBlur("buyer_email")}
                placeholder="Ex: joao@email.com"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="email"
                style={{
                  ...styles.input,
                  ...(showFieldError("buyer_email", emailError)
                    ? styles.inputError
                    : null),
                }}
              />
              {showFieldError("buyer_email", emailError) && (
                <div style={styles.fieldError}>{emailError}</div>
              )}
            </Field>

            <Field label="CPF *">
              <input
                value={form.buyer_document}
                onChange={(e) =>
                  onChange("buyer_document", formatCPF(e.target.value))
                }
                onBlur={() => onBlur("buyer_document")}
                placeholder="Ex: 123.456.789-00"
                inputMode="numeric"
                autoComplete="off"
                style={{
                  ...styles.input,
                  ...(showFieldError("buyer_document", cpfError)
                    ? styles.inputError
                    : null),
                }}
              />
              {showFieldError("buyer_document", cpfError) && (
                <div style={styles.fieldError}>{cpfError}</div>
              )}
            </Field>

            <button
              onClick={continuarParaPagamento}
              disabled={!canContinue}
              style={{
                ...styles.ctaBtn,
                opacity: canContinue ? 1 : 0.4,
                cursor: canContinue ? "pointer" : "not-allowed",
              }}
            >
              {saving ? "RESERVANDO..." : "CONCLUIR E PAGAR"}
            </button>

            <div style={styles.disclaimer}>
              Os números ficam reservados após o clique.
            </div>
          </div>

          {/* Resumo lateral */}
          <div style={styles.summaryCard} className="checkout-summary">
            <h2 style={styles.cardTitle}>Resumo</h2>
            <div style={styles.raffleInfo}>Rifa: {raffle?.title}</div>

            <div style={{ marginTop: 20 }}>
              <div style={styles.summaryLabel}>
                Números ({ticketNumbers.length})
              </div>
              <div style={styles.ticketGrid}>
                {ticketNumbers.map((n) => (
                  <span key={n} style={styles.ticketChip}>
                    {pad4(n)}
                  </span>
                ))}
              </div>
            </div>

            <div style={styles.totalRow}>
              <span>Total a pagar</span>
              <span style={styles.totalValue}>{money(totalCents)}</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* MOBILE FIRST */
        .checkout-container {
          padding: 24px 16px !important;
        }

        .checkout-grid {
          grid-template-columns: 1fr !important;
        }

        .checkout-header {
          flex-direction: column !important;
          align-items: center !important;
          gap: 14px !important;
        }

        .checkout-header button {
          width: 120px !important;
        }

        .checkout-summary {
          position: static !important;
          top: auto !important;
        }

        .checkout-summary span {
          padding: 8px 12px !important;
          border-radius: 10px !important;
        }

        /* TABLET+ */
        @media (min-width: 768px) {
          .checkout-container {
            padding: 40px 20px !important;
          }

          .checkout-grid {
            grid-template-columns: 1fr 320px !important;
          }

          .checkout-header {
            flex-direction: row !important;
            align-items: center !important;
            gap: 0 !important;
          }

          .checkout-header button {
            width: auto !important;
          }

          .checkout-summary {
            position: sticky !important;
            top: 20px !important;
          }
        }

        @media (max-width: 380px) {
          .checkout-container {
            padding: 18px 12px !important;
          }
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontWeight: 800,
          fontSize: 13,
          marginBottom: 8,
          color: "#666",
        }}
      >
        {label}
      </div>
      {children}
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
  container: { maxWidth: 850, margin: "0 auto", padding: "40px 20px" },
  loadingPage: {
    minHeight: "100vh",
    background: "#000",
    display: "grid",
    placeItems: "center",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
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

  contentGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 320px",
    gap: 24,
    alignItems: "start",
  },

  card: {
    background: "#050505",
    border: "1px solid #1a1a1a",
    borderRadius: 24,
    padding: 24,
  },
  summaryCard: {
    background: "#111",
    border: "1px solid #222",
    borderRadius: 24,
    padding: 24,
    position: "sticky",
    top: 20,
  },

  cardTitle: { fontSize: 18, fontWeight: 900, margin: "0 0 20px 0" },
  raffleInfo: { fontSize: 14, color: "#888", fontWeight: 600 },

  input: {
    width: "100%",
    background: "#000",
    border: "1px solid #222",
    padding: "14px",
    borderRadius: 12,
    color: "#fff",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
  },

  inputError: {
    border: "1px solid #ff4444",
  },

  fieldError: {
    marginTop: 8,
    fontSize: 12,
    color: "#ff4444",
    fontWeight: 700,
  },

  inputHint: { fontSize: 11, color: "#444", marginTop: 6, fontWeight: 600 },

  ctaBtn: {
    marginTop: 12,
    width: "100%",
    padding: "16px",
    borderRadius: 14,
    border: "none",
    background: "#fff",
    color: "#000",
    fontWeight: 900,
    fontSize: 15,
    letterSpacing: "0.5px",
  },
  disclaimer: {
    marginTop: 14,
    fontSize: 11,
    color: "#444",
    textAlign: "center",
    fontWeight: 600,
  },

  summaryLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: "#444",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  ticketGrid: { display: "flex", gap: 6, flexWrap: "wrap" },
  ticketChip: {
    background: "#000",
    color: "#fff",
    padding: "6px 10px",
    borderRadius: 8,
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid #333",
  },

  totalRow: {
    marginTop: 32,
    paddingTop: 20,
    borderTop: "1px solid #222",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalValue: { fontSize: 24, fontWeight: 900, letterSpacing: "-1px" },

  errorBox: {
    marginBottom: 20,
    background: "#1a0000",
    color: "#ff4444",
    padding: 14,
    borderRadius: 12,
    fontSize: 13,
    border: "1px solid #440000",
  },
};
