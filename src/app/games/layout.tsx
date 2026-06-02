import { GamesGate } from "@/components/games-gate";

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return <GamesGate>{children}</GamesGate>;
}
