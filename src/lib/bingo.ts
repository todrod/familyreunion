import pool from "@/lib/db";

// Self-provisioning schema for the bingo lobby/join feature, so it works on a
// fresh or already-deployed database without manual migrations.
//
// - `started` flag on bingo_sessions: 0 = lobby (players joining), 1 = playing.
// - bingo_players: who has joined the current game (the host roster).
//
// MariaDB supports `ADD COLUMN IF NOT EXISTS`, which keeps this idempotent.

let ensured = false;

export async function ensureBingoSchema(): Promise<void> {
  if (ensured) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bingo_players (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      session_id  INT NOT NULL,
      player_name VARCHAR(100) NOT NULL,
      joined_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_bingo_player (session_id, player_name),
      INDEX idx_bingo_players_session (session_id)
    )
  `);

  await pool.query(
    "ALTER TABLE bingo_sessions ADD COLUMN IF NOT EXISTS started TINYINT(1) NOT NULL DEFAULT 0"
  );

  ensured = true;
}
