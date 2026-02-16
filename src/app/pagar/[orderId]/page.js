"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import Image from "next/image";

export default function PagarPage() {
  const params = useParams();
  const orderId = params?.orderId;

  const [pixCode, setPixCode] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    async function ensurePayment() {
      try {
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
          if (!resPost.ok) {
            console.error(dataPost);
            return;
          }
          code = dataPost?.payment?.pix_copy_paste;
        }

        // 3) gera QR no front
        if (code) {
          setPixCode(code);
          const qr = await QRCode.toDataURL(code);
          setQrImage(qr);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    ensurePayment();
  }, [orderId]);

  async function copyPix() {
    if (!pixCode) return;
    await navigator.clipboard.writeText(pixCode);
    alert("Pix copiado!");
  }

  if (!orderId) return <p>Carregando...</p>;
  if (loading) return <p>Gerando Pix...</p>;

  return (
    <div style={{ padding: 20, maxWidth: 600 }}>
      <h1>Pagar Pedido</h1>

      {qrImage ? (
        <div style={{ margin: "16px 0" }}>
          <Image src={qrImage} alt="QR Code Pix" width={260} height={260} />
        </div>
      ) : (
        <p>Não foi possível gerar o QR Code.</p>
      )}

      <label style={{ display: "block", marginTop: 12, marginBottom: 6 }}>
        Código Pix (copia e cola)
      </label>

      <textarea
        value={pixCode}
        readOnly
        style={{ width: "100%", height: 120, padding: 10 }}
      />

      <div style={{ marginTop: 12 }}>
        <button onClick={copyPix} disabled={!pixCode}>
          Copiar código Pix
        </button>
      </div>
    </div>
  );
}
