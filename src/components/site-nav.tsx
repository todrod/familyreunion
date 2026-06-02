"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface SiteNavProps {
  extraRight?: React.ReactNode;
  noPrint?: boolean;
}

export function SiteNav({ extraRight, noPrint }: SiteNavProps) {
  const pathname = usePathname();
  const isGames = pathname.startsWith("/games");
  const isPlanning = pathname === "/planning" || pathname.startsWith("/planning/");
  const isBingo = pathname === "/games";
  const isTrivia = pathname === "/games/trivia" || pathname === "/games/trivia/";
  const isHost = pathname.startsWith("/games/trivia/host");

  const activeTop = "rounded-lg border border-[#C99500]/40 bg-[#C99500]/10 px-3 py-1.5 text-sm font-medium text-[#C99500]";
  const inactiveTop = "rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors";
  const activeSub = "rounded-lg bg-muted px-3 py-1 text-sm font-medium text-foreground";
  const inactiveSub = "rounded-lg px-3 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors";

  return (
    <header className={`sticky top-0 z-20 border-b border-border/60 bg-card/80 backdrop-blur-sm${noPrint ? " no-print" : ""}`}>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Image src="/reunion-crest.webp" alt="crest" width={28} height={28} className="rounded-full opacity-85" style={{ width: "28px", height: "28px" }} />
          <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>Family Reunion</span>
        </div>
        <div className="flex items-center gap-3">
          {extraRight}
          <nav className="flex items-center gap-1">
            <Link href="/planning" className={isPlanning ? activeTop : inactiveTop}>Planning</Link>
            <Link href="/schedule" className={pathname.startsWith("/schedule") ? activeTop : inactiveTop}>Schedule</Link>
            <Link href="/games" className={isGames ? activeTop : inactiveTop}>Games</Link>
            <Link href="/games/display" target="_blank" className={inactiveTop} title="Open TV display">📺</Link>
            <Link href="/host" className={pathname.startsWith("/host") ? activeTop : inactiveTop} title="Host panel">🔒</Link>
          </nav>
        </div>
      </div>

      {/* Games sub-nav */}
      {isGames && (
        <div className="border-t border-border/40">
          <div className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-1.5">
            <Link href="/games" className={isBingo ? activeSub : inactiveSub}>Bingo</Link>
            <Link href="/games/trivia" className={(isTrivia || isHost) ? activeSub : inactiveSub}>Trivia</Link>
            {isHost && (
              <span className="ml-auto rounded-lg border border-[#C99500]/30 bg-[#C99500]/10 px-3 py-1 text-xs font-medium text-[#C99500]">
                🔒 Host Panel
              </span>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
