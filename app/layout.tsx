import type { Metadata } from "next";
import "./globals.css";
import CyberpunkBackground from "../components/CyberpunkBackground";

export const metadata: Metadata = {
  title: "Plutus",
  description: "Real-time SGD foreign exchange dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-transparent">
      <body className="min-h-screen text-neutral-100 antialiased overflow-x-hidden bg-transparent">
        <CyberpunkBackground />
        {children}
      </body>
    </html>
  );
}
