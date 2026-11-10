import type { Metadata } from "next";
import { Overpass } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/components/ui/lang.tsx";
import { NavBar } from "@/components/ui/NavBar.tsx";
import Footer from "@/components/ui/Footer.tsx";
import { TargetCursor } from "@/components/ui/TargetCursor.tsx";

const overpass = Overpass({
  variable: "--font-ui",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Cek Kerja",
  description:
    "Cek lowongan, kontrak kerja, dan persiapan interview untuk mahasiswa dan fresh graduate.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${overpass.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-ground text-ink">
        <LangProvider>
          <NavBar />
          <main className="flex-1">{children}</main>
          <Footer />
          <TargetCursor />
        </LangProvider>
      </body>
    </html>
  );
}
