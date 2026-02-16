import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={`bg-black `}>{children}</body>
    </html>
  );
}
