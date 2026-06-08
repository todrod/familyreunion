"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace("/planning");
      } else {
        setError(true);
        setPassword("");
        setLoading(false);
      }
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Image
            src="/reunion-crest.webp"
            alt="Aversa Family Reunion crest"
            width={84}
            height={84}
            className="mx-auto rounded-full opacity-90"
            style={{ width: "84px", height: "84px" }}
            priority
          />
          <h1 className="mt-4 text-3xl text-foreground" style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>
            Aversa Family Reunion
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the family password to view the planning hub.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="Password…"
              autoFocus
              className={`h-11 w-full rounded-xl border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors ${error ? "border-[#B84A28]/60 focus:ring-[#B84A28]/20" : "border-border focus:border-[#C99500]/60 focus:ring-[#C99500]/20"}`}
            />
          </div>
          {error && <p className="text-xs text-[#B84A28]">Incorrect password — try again.</p>}
          <Button
            type="submit"
            disabled={loading || !password}
            className="h-11 w-full bg-[#C99500] text-[#2E1503] font-medium hover:bg-[#B84A28] hover:text-[#F7EDD4]"
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
