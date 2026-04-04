"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (res.ok) {
      router.push("/planning");
    } else {
      setError("That's not it. Try again.");
      setPassword("");
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#1c1208]">
      {/* Warm texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f5ede0' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Radial glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[500px] rounded-full bg-[#c8553d]/8 blur-[120px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 px-6">
        {/* Monogram / logo mark */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full border border-[#d4a853]/30 text-[#d4a853]"
            style={{ background: "radial-gradient(circle, rgba(212,168,83,0.12) 0%, transparent 70%)" }}
          >
            <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8" aria-hidden>
              <path d="M16 3C9 3 4 8 4 14c0 4 2.5 7.5 6 9.5V28l6-3 6 3v-4.5C25.5 21.5 28 18 28 14c0-6-5-11-12-11Z" stroke="#d4a853" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M12 14c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4Z" fill="#d4a853" fillOpacity="0.3" stroke="#d4a853" strokeWidth="1.2"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-[#a0886a]">You&apos;re invited</p>
            <h1
              className="mt-1 text-3xl text-[#f5ede0]"
              style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}
            >
              Family Reunion
            </h1>
            <p className="mt-1 text-sm text-[#a0886a]">Rodriguez · Aversa</p>
          </div>
        </div>

        {/* Login card */}
        <div className="w-full rounded-2xl border border-[#f5ede0]/10 bg-[#261a0c] p-8 shadow-2xl">
          <p className="mb-6 text-center text-sm text-[#a0886a]">
            This is a private family page. Enter the password to continue.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#c4a97d]">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a0886a]" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  className="border-[#f5ede0]/10 bg-[#1c1208] pl-10 text-[#f5ede0] placeholder:text-[#6b5540] focus-visible:border-[#d4a853]/50 focus-visible:ring-[#d4a853]/20"
                />
              </div>
            </div>
            {error && (
              <p className="text-center text-sm text-[#c8553d]">{error}</p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#d4a853] text-[#1c1208] hover:bg-[#c8553d] hover:text-[#f5ede0] transition-colors font-medium"
            >
              {loading ? "Checking…" : "Enter the Hub"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[#6b5540]">
          Need access? Talk to the reunion organizer.
        </p>
      </div>
    </div>
  );
}
