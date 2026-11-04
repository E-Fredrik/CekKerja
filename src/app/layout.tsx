import type { Metadata } from "next";
import { Overpass } from "next/font/google";
import "./globals.css";

// Design system typeface (DESIGN.md): Overpass, variable weight, exposed as --font-ui.
const overpass = Overpass({
  variable: "--font-ui",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Cek Kerja",
  description: "Cek lowongan, kontrak kerja, dan persiapan interview untuk mahasiswa dan fresh graduate.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${overpass.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
