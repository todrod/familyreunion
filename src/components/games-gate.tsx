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
            <Lock className="mx-auto h-8 w-8 text-[#c28e2b]/70 mb-3" />
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
            className={`h-10 w-full rounded-xl border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors ${error ? "border-[#bf5a33]/60 focus:ring-[#bf5a33]/20" : "border-border focus:border-[#c28e2b]/60 focus:ring-[#c28e2b]/20"}`}
          />
          {error && <p className="text-xs text-[#bf5a33]">Incorrect password.</p>}
          <Button onClick={unlock} className="h-10 w-full bg-[#c28e2b] text-[#14321f] hover:bg-[#bf5a33] hover:text-[#f6f1e2]">
            Unlock
          </Button>
        </div>
      </div>
    </div>
  );
}
