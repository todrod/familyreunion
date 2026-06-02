import pool from "@/lib/db";

// Self-provisioning schema for trivia, so the game works on a fresh or
// already-deployed database without manual migrations (the deploy does not run
// schema.sql).

let ensured = false;

export async function ensureTriviaSchema(): Promise<void> {
  if (ensured) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trivia_sessions (
      id               INT AUTO_INCREMENT PRIMARY KEY,
      status           ENUM('waiting','question','reveal','finished') NOT NULL DEFAULT 'waiting',
      current_question INT NOT NULL DEFAULT 0,
      questions        MEDIUMTEXT,
      created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trivia_players (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      session_id  INT NOT NULL,
      player_name VARCHAR(100) NOT NULL,
      joined_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_player (session_id, player_name)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trivia_answers (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      session_id      INT NOT NULL,
      question_index  INT NOT NULL,
      player_name     VARCHAR(100) NOT NULL,
      answer          VARCHAR(1) NOT NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_answer (session_id, question_index, player_name)
    )
  `);

  ensured = true;
}
