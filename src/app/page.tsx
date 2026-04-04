"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      setError("Wrong password. Try again.");
      setPassword("");
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-sm border-white/10 bg-zinc-900">
        <CardHeader className="space-y-1 text-center">
          <div className="text-4xl">🎉</div>
          <CardTitle className="text-xl">Family Reunion</CardTitle>
          <p className="text-sm text-zinc-400">Enter the password to access planning</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                autoFocus
                className="border-white/10 bg-zinc-800"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Checking…" : "Enter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
