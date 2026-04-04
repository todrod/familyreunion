import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Family Reunion",
  description: "Rodriguez / Aversa Family Reunion Planning",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} dark`}>
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <header className="border-b border-white/10 bg-zinc-900/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
            <span className="text-2xl">🎉</span>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">Family Reunion</h1>
              <p className="text-xs text-zinc-400">Planning Hub</p>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
