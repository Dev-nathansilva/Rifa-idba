"use client";

export default function LoadingScreen({ label = "" }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.spinner} />
      {label ? <div style={styles.label}>{label}</div> : null}

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: "100vh",
    background: "#000",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "rgba(255,255,255,0.65)",
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "3px solid rgba(255, 255, 255, 0.10)",
    borderTopColor: "#fff",
    animation: "spin 0.8s linear infinite",
  },
  label: {
    marginTop: 14,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 2,
    opacity: 0.55,
    textTransform: "uppercase",
  },
};
