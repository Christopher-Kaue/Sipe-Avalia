import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "@frontend/estilos/globals.css";

const serif = Fraunces({ subsets: ["latin"], axes: ["opsz", "SOFT"], style: ["normal", "italic"], variable: "--fonte-serif" });
const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--fonte-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--fonte-mono" });

export const metadata: Metadata = {
  title: { default: "SIPE · Avaliação de Pôsteres", template: "%s · SIPE FADERGS" },
  description: "Avaliação dos pôsteres do Salão de Iniciação Científica, Pesquisa e Extensão da FADERGS.",
  icons: { icon: "/brand/fadergs-escudo.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#c02030" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
