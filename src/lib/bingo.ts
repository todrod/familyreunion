import pool from "@/lib/db";

// Self-provisioning schema for bingo, so the game works on a fresh or
// already-deployed database without manual migrations (the deploy does not run
// schema.sql). Includes the lobby/join additions:
//   - `started` flag on bingo_sessions: 0 = lobby (players joining), 1 = playing
//   - bingo_players: who has joined the current game (the host roster)

let ensured = false;

export async function ensureBingoSchema(): Promise<void> {
  if (ensured) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bingo_sessions (
      id                    INT AUTO_INCREMENT PRIMARY KEY,
      status                ENUM('active','finished') NOT NULL DEFAULT 'active',
      word_bank             MEDIUMTEXT NOT NULL,
      call_interval_seconds INT NOT NULL DEFAULT 15,
      started               TINYINT(1) NOT NULL DEFAULT 0,
      created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bingo_called_words (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      session_id  INT NOT NULL,
      word        VARCHAR(200) NOT NULL,
      call_order  INT NOT NULL,
      called_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_bingo_session (session_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bingo_claims (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      session_id      INT NOT NULL,
      player_name     VARCHAR(100) NOT NULL,
      card_words      MEDIUMTEXT NOT NULL,
      marked_indices  TEXT NOT NULL,
      is_valid        TINYINT(1) DEFAULT NULL,
      claimed_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_bingo_claim_session (session_id),
      UNIQUE KEY unique_claim (session_id, player_name)
    )
  `);

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

  // For databases that already had bingo_sessions without the lobby column.
  await pool.query(
    "ALTER TABLE bingo_sessions ADD COLUMN IF NOT EXISTS started TINYINT(1) NOT NULL DEFAULT 0"
  );

  ensured = true;
}
