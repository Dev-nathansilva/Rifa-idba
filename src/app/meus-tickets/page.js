import { Suspense } from "react";
import MeusTicketsClient from "./MeusTicketsCliente";

export default function Page() {
  return (
    <Suspense fallback={<p style={{ padding: 20 }}>Carregando...</p>}>
      <MeusTicketsClient />
    </Suspense>
  );
}
