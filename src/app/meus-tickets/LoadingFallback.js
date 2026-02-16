"use client";

export default function LoadingFallback() {
  return (
    <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
      <div className="spinner" />
      <style jsx>{`
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255, 255, 255, 0.05);
          border-top: 3px solid #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
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
