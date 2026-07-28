import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fundación Meriggi — Gestión clínica",
  description: "Agenda, pacientes, staff y comunicaciones para Fundación Meriggi.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
