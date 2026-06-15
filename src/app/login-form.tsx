"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoSigningIn, setAutoSigningIn] = useState(false);
  const router = useRouter();

  async function attemptLogin(pw: string): Promise<boolean> {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) {
      router.replace("/planning");
      return true;
    }
    return false;
  }

  // Magic link: visiting /?k=<password> signs family in automatically — no typing.
  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("k");
    if (!key) return;
    setAutoSigningIn(true);
    attemptLogin(key).then((ok) => {
      if (!ok) setAutoSigningIn(false); // bad/expired key → show the form
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const ok = await attemptLogin(password);
    if (!ok) {
      setError(true);
      setPassword("");
      setLoading(false);
    }
  }

  if (autoSigningIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <Image src="/reunion-crest.webp" alt="crest" width={84} height={84} className="rounded-full opacity-90" style={{ width: "84px", height: "84px" }} priority />
        <p className="mt-5 text-lg text-muted-foreground">Signing you in…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Image
            src="/reunion-crest.webp"
            alt="Aversa Family Reunion crest"
            width={88}
            height={88}
            className="mx-auto rounded-full opacity-90"
            style={{ width: "88px", height: "88px" }}
            priority
          />
          <h1 className="mt-4 text-3xl text-foreground sm:text-4xl" style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>
            Aversa Family Reunion
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Enter the family password to come in.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="Password…"
              autoFocus
              className={`h-14 w-full rounded-2xl border bg-card pl-11 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors ${error ? "border-[#bf5a33]/60 focus:ring-[#bf5a33]/20" : "border-border focus:border-[#c28e2b]/60 focus:ring-[#c28e2b]/20"}`}
            />
          </div>
          {error && <p className="text-sm text-[#bf5a33]">Hmm, that didn&apos;t match. It&apos;s our family name. Try again.</p>}
          <Button
            type="submit"
            disabled={loading || !password}
            className="h-14 w-full rounded-2xl bg-[#c28e2b] text-base font-semibold text-[#14321f] hover:bg-[#bf5a33] hover:text-[#f6f1e2]"
          >
            {loading ? "Checking…" : "Enter"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          14th Aversa Family Reunion · July 17–19, 2026
        </p>
      </div>
    </div>
  );
}
