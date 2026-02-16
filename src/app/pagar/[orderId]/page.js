"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import QRCode from "qrcode";
import Image from "next/image";

function pad4(n) {
  return String(n).padStart(4, "0");
}

function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

function money(cents) {
  return `R$ ${(Number(cents || 0) / 100).toFixed(2)}`;
}

export default function PagarPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.orderId;

  const [pixCode, setPixCode] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ✅ resumo do pedido
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);

  const ticketNumbers = useMemo(() => {
    return (items || [])
      .map((i) => i.ticket_number)
      .filter((n) => n !== null && n !== undefined)
      .sort((a, b) => a - b);
  }, [items]);

  useEffect(() => {
    if (!orderId) return;

    async function loadAll() {
      setLoading(true);
      setErrorMsg("");
      const startTime = Date.now();

      try {
        // ✅ 0) carrega o pedido (resumo + dados do comprador)
        const resOrder = await fetch(`/api/orders/${orderId}`);
        const dataOrder = await resOrder.json();
        if (!resOrder.ok)
          throw new Error(dataOrder?.error || "Erro ao buscar pedido");

        setOrder(dataOrder.order || null);
        setItems(dataOrder.items || []);

        // 1) tenta buscar pagamento existente
        const resGet = await fetch(`/api/orders/${orderId}/payment`);
        const dataGet = await resGet.json();

        let code = dataGet?.payment?.pix_copy_paste;

        // 2) se não existir, gera
        if (!code) {
          const resPost = await fetch(`/api/orders/${orderId}/pay`, {
            method: "POST",
          });
          const dataPost = await resPost.json();
          if (!resPost.ok)
            throw new Error(dataPost?.error || "Erro ao gerar PIX");
          code = dataPost?.payment?.pix_copy_paste;
        }

        if (code) {
          setPixCode(code);
          const qr = await QRCode.toDataURL(code, {
            margin: 2,
            width: 600,
            color: { dark: "#000000", light: "#ffffff" },
          });
          setQrImage(qr);
        }

        // Delay para spinner “charme”
        const elapsed = Date.now() - startTime;
        if (elapsed < 900)
          await new Promise((r) => setTimeout(r, 900 - elapsed));
      } catch (err) {
        console.error(err);
        setErrorMsg(err?.message || "Erro");
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, [orderId]);

  async function copyPix() {
    if (!pixCode) return;
    await navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div className="spinner-main" />
        <div style={styles.loadingText}>GERANDO SEU PIX...</div>
        <style jsx>{`
          .spinner-main {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.05);
            border-top: 3px solid #fff;
            border-radius: 50%;
            animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
          @keyframes spin {
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header className="flex-col md:flex-row" style={styles.header}>
          <div className="w-full text-center md:text-left">
            <div style={styles.kicker}>Pagamento</div>
            <h1 style={styles.title}>Finalizar Compra</h1>
          </div>
          <button
            onClick={() => router.push("/meus-tickets")}
            style={styles.ghostBtn}
          >
            Meus Pedidos
          </button>
        </header>

        {errorMsg && (
          <div style={styles.errorBox}>
            <b>Erro:</b> {errorMsg}
          </div>
        )}

        {/* PIX CARD */}
        <div style={styles.card}>
          {/* Bloco Importante */}
          <div style={styles.importantBox}>
            <div style={styles.importantHeader}>
              <div style={styles.importantIcon}>!</div>
              <span style={styles.importantTitle}>Importante</span>
            </div>

            <p style={styles.importantText}>
              Após efetuar o pagamento, envie o comprovante de pagamento no{" "}
              <b className="font-extrabold">WhatsApp</b> para o(a)
              administrador(a) da campanha{" "}
              <span className="underline">aprovar o seu pedido.</span>
            </p>

            <a
              href="https://wa.me/5585997416242"
              target="_blank"
              rel="noreferrer"
              style={styles.importantBtn}
            >
              <span style={styles.waIcon} aria-hidden>
                {/* WhatsApp icon */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M20.52 3.48A11.8 11.8 0 0012.06 0C5.48 0 .06 5.4.06 12.06c0 2.12.56 4.2 1.62 6.02L0 24l6.1-1.6a11.98 11.98 0 005.96 1.52h.01c6.58 0 12-5.4 12-12.06 0-3.2-1.24-6.2-3.55-8.38zM12.07 21.5a9.4 9.4 0 01-4.8-1.32l-.34-.2-3.62.95.97-3.52-.22-.36a9.3 9.3 0 01-1.44-4.99c0-5.18 4.23-9.4 9.44-9.4 2.52 0 4.88.98 6.66 2.74a9.33 9.33 0 012.78 6.66c0 5.18-4.23 9.4-9.43 9.4zm5.18-7.04c-.28-.14-1.66-.82-1.92-.92-.26-.1-.44-.14-.63.14-.18.28-.72.92-.88 1.1-.16.18-.32.2-.6.06-.28-.14-1.18-.44-2.25-1.4-.83-.74-1.4-1.66-1.56-1.94-.16-.28-.02-.43.12-.57.13-.13.28-.32.42-.48.14-.16.18-.28.28-.46.1-.18.04-.34-.02-.48-.06-.14-.63-1.52-.86-2.08-.22-.52-.45-.45-.63-.46l-.54-.01c-.18 0-.48.06-.74.34-.26.28-1 1-.98 2.44.02 1.44 1.02 2.82 1.16 3.02.14.2 2 3.06 4.84 4.28.67.29 1.2.46 1.61.6.68.22 1.3.19 1.79.12.55-.08 1.66-.68 1.9-1.34.24-.66.24-1.22.16-1.34-.08-.12-.26-.2-.54-.34z" />
                </svg>
              </span>
              Enviar comprovante
            </a>
          </div>

          <div style={styles.qrSection}>
            <div style={styles.qrWrapper}>
              {qrImage ? (
                <Image
                  src={qrImage}
                  alt="QR Code Pix"
                  width={260}
                  height={260}
                  style={{ borderRadius: 12 }}
                />
              ) : (
                <div style={styles.qrError}>QR Code Indisponível</div>
              )}
            </div>
            <p style={styles.stepText}>
              1. Abra o app do seu banco e escaneie o código
            </p>
          </div>

          <div style={styles.divider}>
            <span style={styles.dividerText}>OU COPIE O CÓDIGO</span>
          </div>

          <div style={styles.copySection}>
            <div style={styles.pixBox}>
              <div style={styles.pixCodeText}>{pixCode}</div>
            </div>

            <button
              onClick={copyPix}
              disabled={!pixCode}
              style={{
                ...styles.copyBtn,
                background: copied ? "#10b981" : "#fff",
                color: copied ? "#fff" : "#000",
              }}
            >
              {copied ? "✓ CÓDIGO COPIADO!" : "COPIAR CÓDIGO PIX"}
            </button>
          </div>

          {/* ✅ RESUMO + DADOS (embaixo do pix) */}
          <div style={styles.bottomDetails}>
            {/* Resumo */}
            <div style={styles.detailCard}>
              <div style={styles.detailTitle}>Resumo do pedido</div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Números</span>
                <span style={styles.detailValue}>{ticketNumbers.length}</span>
              </div>

              <div style={{ ...styles.numbersWrap, marginTop: 10 }}>
                {ticketNumbers.length === 0 ? (
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>—</span>
                ) : (
                  ticketNumbers.slice(0, 30).map((n) => (
                    <span key={n} style={styles.numChip}>
                      {pad4(n)}
                    </span>
                  ))
                )}
                {ticketNumbers.length > 30 && (
                  <span style={styles.moreChip}>
                    +{ticketNumbers.length - 30}
                  </span>
                )}
              </div>

              <div style={{ ...styles.detailRow, marginTop: 14 }}>
                <span style={styles.detailLabel}>Total</span>
                <span style={{ ...styles.detailValue, fontWeight: 900 }}>
                  {money(order?.total_cents)}
                </span>
              </div>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                ID do pedido:{" "}
                <span style={{ fontFamily: "monospace" }}>{order?.id}</span>
              </div>
            </div>

            {/* Dados */}
            <div style={styles.detailCard}>
              <div style={styles.detailTitle}>Seus dados</div>

              <InfoLine label="Nome" value={order?.buyer_name || "—"} />
              <InfoLine
                label="Telefone"
                value={order?.buyer_phone ? onlyDigits(order.buyer_phone) : "—"}
              />
              <InfoLine label="E-mail" value={order?.buyer_email || "—"} />
              <InfoLine label="CPF" value={order?.buyer_document || "—"} />
            </div>
          </div>
        </div>

        <div style={styles.infoBox}>
          <div style={styles.infoIcon}>i</div>
          <p style={styles.infoText}>
            Após o pagamento, seu pedido será processado automaticamente. A
            reserva expira em <b>15 minutos</b>.
          </p>
        </div>

        {/* Footer actions */}
        <div style={styles.footerActions}>
          <a
            href="https://instagram.com/idbaldeota"
            target="_blank"
            rel="noreferrer"
            style={styles.instagramBtn}
          >
            <span style={styles.igIcon} aria-hidden>
              {/* Instagram icon (SVG) */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7.5 2H16.5C19.5376 2 22 4.46243 22 7.5V16.5C22 19.5376 19.5376 22 16.5 22H7.5C4.46243 22 2 19.5376 2 16.5V7.5C2 4.46243 4.46243 2 7.5 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M12 16.2C14.3196 16.2 16.2 14.3196 16.2 12C16.2 9.6804 14.3196 7.8 12 7.8C9.6804 7.8 7.8 9.6804 7.8 12C7.8 14.3196 9.6804 16.2 12 16.2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M17.6 6.6H17.61"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            Instagram
          </a>

          <div style={styles.secureCheckout}>
            <span style={styles.lockIcon} aria-hidden>
              {/* Lock icon (SVG) */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7 11V8.5C7 5.46243 9.46243 3 12.5 3C15.5376 3 18 5.46243 18 8.5V11"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M6.5 11H18.5C19.8807 11 21 12.1193 21 13.5V19C21 20.3807 19.8807 21.5 18.5 21.5H6.5C5.11929 21.5 4 20.3807 4 19V13.5C4 12.1193 5.11929 11 6.5 11Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </span>

            <span style={styles.secureText}>Checkout 100% seguro</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div style={styles.infoLine}>
      <div style={styles.infoLineLabel}>{label}</div>
      <div style={styles.infoLineValue}>{value}</div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#000",
    color: "#fff",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  },
  container: { maxWidth: 560, margin: "0 auto", padding: "36px 16px" },

  loadingPage: {
    minHeight: "100vh",
    background: "#000",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 11,
    fontWeight: 800,
    opacity: 0.5,
    letterSpacing: 2,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
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
    padding: "10px 14px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  errorBox: {
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.25)",
    padding: 12,
    borderRadius: 16,
    marginBottom: 14,
    color: "white",
  },

  card: {
    background: "#050505",
    border: "1px solid #1a1a1a",
    borderRadius: 28,
    padding: "26px 18px",
    textAlign: "center",
  },

  qrSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  qrWrapper: {
    background: "#fff",
    padding: 12,
    borderRadius: 22,
    display: "inline-flex",
    boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
  },
  qrError: {
    width: 260,
    height: 260,
    display: "grid",
    placeItems: "center",
    color: "#666",
    fontSize: 14,
    fontWeight: 700,
  },
  stepText: { fontSize: 13, color: "#8a8a8a", fontWeight: 650, margin: 0 },

  divider: {
    position: "relative",
    margin: "26px 0",
    borderTop: "1px solid #1a1a1a",
  },
  dividerText: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "#050505",
    padding: "0 12px",
    fontSize: 10,
    fontWeight: 900,
    color: "#444",
    letterSpacing: 1,
  },

  copySection: { display: "flex", flexDirection: "column", gap: 12 },
  pixBox: {
    background: "#000",
    border: "1px solid #222",
    padding: 14,
    borderRadius: 16,
    maxHeight: 92,
    overflow: "hidden",
    position: "relative",
  },
  pixCodeText: {
    fontSize: 12,
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    color: "#777",
    wordBreak: "break-all",
    textAlign: "left",
    maskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
  },
  copyBtn: {
    width: "100%",
    padding: "16px",
    borderRadius: 16,
    border: "none",
    fontWeight: 950,
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  // ✅ detalhes embaixo do pix
  bottomDetails: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
    textAlign: "left",
  },
  detailCard: {
    background: "#070707",
    border: "1px solid #171717",
    borderRadius: 18,
    padding: 14,
  },
  detailTitle: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: 900,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 12,
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "baseline",
  },
  detailLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: 800,
  },
  detailValue: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontWeight: 800,
  },

  numbersWrap: {
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
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "white",
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 12,
    fontWeight: 900,
  },
  moreChip: {
    height: 28,
    display: "inline-flex",
    alignItems: "center",
    padding: "0 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.05)",
    border: "1px dashed rgba(255,255,255,0.14)",
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: 900,
  },

  infoLine: {
    display: "grid",
    gridTemplateColumns: "96px 1fr",
    gap: 10,
    padding: "10px 0",
    borderTop: "1px solid rgba(255,255,255,0.06)",
  },
  infoLineLabel: {
    fontSize: 12,
    fontWeight: 900,
    color: "rgba(255,255,255,0.55)",
  },
  infoLineValue: {
    fontSize: 13,
    fontWeight: 900,
    color: "rgba(255,255,255,0.92)",
    wordBreak: "break-word",
  },

  infoBox: {
    marginTop: 16,
    background: "#0a0a0a",
    border: "1px solid #111",
    padding: 14,
    borderRadius: 18,
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  infoIcon: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "#222",
    display: "grid",
    placeItems: "center",
    fontSize: 10,
    fontWeight: 900,
    color: "#888",
    flex: "0 0 auto",
  },
  infoText: { fontSize: 12, color: "#777", margin: 0, lineHeight: "1.5" },

  footerActions: {
    marginTop: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    alignItems: "center",
  },

  instagramBtn: {
    width: "100%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "14px 16px",
    borderRadius: 16,
    background: "#111",
    border: "1px solid #222",
    color: "#fff",
    fontWeight: 900,
    textDecoration: "none",
    cursor: "pointer",
  },

  igIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.9,
  },

  secureCheckout: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: 800,
  },

  lockIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "rgba(255,255,255,0.6)",
  },

  secureText: {
    letterSpacing: 0.2,
  },

  importantBox: {
    background: "#0d0d0d",
    border: "1px solid #1f1f1f",
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
  },

  importantHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },

  importantIcon: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "#ff990a",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    fontSize: 14,
    color: "#000",
  },

  importantTitle: {
    fontWeight: 900,
    fontSize: 16,
    color: "#ff990a",
  },

  importantText: {
    fontSize: 14,
    color: "#aaa",
    lineHeight: 1.6,
    marginBottom: 18,
  },

  importantBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    background: "#25D366",
    color: "#000",
    padding: "12px 18px",
    borderRadius: 14,
    fontWeight: 900,
    textDecoration: "none",
  },

  waIcon: {
    display: "inline-flex",
    alignItems: "center",
  },
};
