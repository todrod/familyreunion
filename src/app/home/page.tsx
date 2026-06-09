"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import QRCode from "react-qr-code";
import { SiteNav } from "@/components/site-nav";
import {
  Users, UtensilsCrossed, CalendarDays, Gamepad2, ChevronRight, Printer, QrCode,
} from "lucide-react";

const TILES = [
  {
    href: "/planning",
    label: "RSVP & Headcount",
    desc: "Let us know who's coming and how many rooms you need.",
    Icon: Users,
    color: "#bf5a33",
  },
  {
    href: "/bbq",
    label: "What to Bring",
    desc: "See the BBQ list and what's still needed.",
    Icon: UtensilsCrossed,
    color: "#2f6b43",
  },
  {
    href: "/schedule",
    label: "Schedule",
    desc: "Times and plans for the whole weekend.",
    Icon: CalendarDays,
    color: "#c28e2b",
  },
  {
    href: "/games",
    label: "Play Games",
    desc: "Family Bingo and live Trivia.",
    Icon: Gamepad2,
    color: "#5f8a57",
  },
];

export default function HomeHub() {
  const [inviteUrl, setInviteUrl] = useState("");

  useEffect(() => {
    // Magic link that signs family in automatically (no password to type).
    setInviteUrl(`${window.location.origin}/?k=Aversa`);
  }, []);

  return (
    <>
      <style>{`
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="min-h-screen bg-background">
        <SiteNav noPrint />

        <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">

          {/* Hero */}
          <div className="no-print relative overflow-hidden rounded-2xl border border-[#c28e2b]/20 bg-gradient-to-br from-[#1d4d33] to-[#14321f] px-6 py-8 text-center sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[#c28e2b]/8 blur-[80px]" />
            <div className="relative">
              <Image src="/reunion-crest.webp" alt="crest" width={72} height={72} className="mx-auto rounded-full opacity-90" style={{ width: "72px", height: "72px" }} />
              <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[#b39357]">Benvenuti · Welcome</p>
              <h1 className="mt-1 text-3xl text-[#f6f1e2] sm:text-4xl" style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>
                14th Aversa Family Reunion
              </h1>
              <p className="mt-3 text-[#c8a86a]">July 17–19, 2026 · Old Bridge, NJ</p>
            </div>
          </div>

          {/* Big friendly tiles */}
          <div className="no-print grid gap-4 sm:grid-cols-2">
            {TILES.map(({ href, label, desc, Icon, color }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-[#c28e2b]/40 hover:shadow-md"
              >
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${color}1A`, color }}
                >
                  <Icon className="h-7 w-7" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-playfair)" }}>{label}</span>
                  <span className="block text-sm text-muted-foreground">{desc}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>

          {/* Invite / share QR */}
          {inviteUrl && (
            <div className="no-print rounded-2xl border border-border bg-card p-6 text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
                <QrCode className="h-4 w-4 text-[#c28e2b]" /> Invite the family
              </div>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Print this and put it on a table, or text the photo. Family members <strong>scan it to open the site instantly</strong> — no password to type.
              </p>
              <div className="mx-auto mt-4 w-fit rounded-2xl border border-border bg-white p-4">
                <QRCode value={inviteUrl} size={150} bgColor="#ffffff" fgColor="#14321f" />
              </div>
              <button
                onClick={() => window.print()}
                className="mx-auto mt-4 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-[#c28e2b]/40 hover:text-foreground"
              >
                <Printer className="h-4 w-4" /> Print sign
              </button>
            </div>
          )}

          {/* Print-only big sign */}
          {inviteUrl && (
            <div className="print-only py-10 text-center">
              <h2 style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic", fontSize: "32px", color: "#14321f" }}>
                14th Aversa Family Reunion
              </h2>
              <p style={{ marginTop: 8, fontSize: 18, color: "#444" }}>Scan to open our family website</p>
              <div style={{ margin: "24px auto", width: "fit-content", padding: 16, border: "1px solid #ccc" }}>
                <QRCode value={inviteUrl} size={260} bgColor="#ffffff" fgColor="#14321f" />
              </div>
              <p style={{ fontSize: 16, color: "#666" }}>No password needed — it opens right up.</p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
