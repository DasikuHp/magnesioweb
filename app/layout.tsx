import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MSI Sport — Magnesio Natural | magnesionatural.com",
  description:
    "Formulado para estilos de vida activos. Magnesio puro de alta absorción con Vitamina C.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
