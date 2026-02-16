import { Suspense } from "react";
import MeusTicketsClient from "./MeusTicketsCliente";
import LoadingFallback from "./LoadingFallback";

export default function Page() {
  return (
    <div style={{ background: "#000", minHeight: "100vh" }}>
      <Suspense fallback={<LoadingFallback />}>
        <MeusTicketsClient />
      </Suspense>
    </div>
  );
}
