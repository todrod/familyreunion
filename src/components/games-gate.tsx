"use client";

import { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";

// Lightweight client-side gate for the Games section — keeps the games a
// surprise until reveal time. Not real security; just a soft lock.
const GAMES_PASSWORD = "5260";
const LS_KEY = "reunion_games_unlocked";

export function GamesGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(LS_KEY) === "1") setUnlocked(true);
    setReady(true);
  }, []);

  function unlock() {
    if (pw === GAMES_PASSWORD) {
      localStorage.setItem(LS_KEY, "1");
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  // Avoid a flash of the password box for already-unlocked visitors.
  if (!ready) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="flex flex-col items-center justify-center px-4 py-24">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center">
            <Lock className="mx-auto h-8 w-8 text-[#C99500]/70 mb-3" />
            <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>
              Games — Coming Soon
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The reunion games are a surprise! Enter the password to take a peek.
            </p>
          </div>
          <input
            type="password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setError(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") unlock(); }}
            placeholder="Password…"
            autoFocus
            className={`h-10 w-full rounded-xl border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors ${error ? "border-[#B84A28]/60 focus:ring-[#B84A28]/20" : "border-border focus:border-[#C99500]/60 focus:ring-[#C99500]/20"}`}
          />
          {error && <p className="text-xs text-[#B84A28]">Incorrect password.</p>}
          <Button onClick={unlock} className="h-10 w-full bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-[#F7EDD4]">
            Unlock
          </Button>
        </div>
      </div>
    </div>
  );
}
