-- Run this ONCE on your MariaDB VPS to set up the database
CREATE DATABASE IF NOT EXISTS familyreunion CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE familyreunion;

CREATE TABLE IF NOT EXISTS families (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  family_name       VARCHAR(255) NOT NULL,
  contact_name      VARCHAR(255) NOT NULL,
  rooms_requested   INT          NOT NULL DEFAULT 1,
  nights            INT          NOT NULL DEFAULT 2,
  hotel_preference  VARCHAR(100) NOT NULL DEFAULT '',
  has_pets          TINYINT(1)   NOT NULL DEFAULT 0,
  room_type         VARCHAR(50)  NOT NULL DEFAULT '',
  rsvp_status       VARCHAR(20)  NOT NULL DEFAULT 'interested',
  attendees         TEXT,
  phone             VARCHAR(20)  NOT NULL DEFAULT '',
  room_number       VARCHAR(10)  NOT NULL DEFAULT '',
  notes             TEXT,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- If the table already exists, run these to add the new columns:
-- ALTER TABLE families ADD COLUMN phone VARCHAR(20) NOT NULL DEFAULT '' AFTER attendees;
-- ALTER TABLE families ADD COLUMN room_number VARCHAR(10) NOT NULL DEFAULT '' AFTER phone;

-- Trivia game tables
CREATE TABLE IF NOT EXISTS trivia_sessions (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  status           ENUM('waiting','question','reveal','finished') NOT NULL DEFAULT 'waiting',
  current_question INT NOT NULL DEFAULT 0,
  questions        MEDIUMTEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- If the table already exists: ALTER TABLE trivia_sessions ADD COLUMN questions MEDIUMTEXT AFTER current_question;

CREATE TABLE IF NOT EXISTS trivia_players (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  session_id       INT NOT NULL,
  player_name      VARCHAR(100) NOT NULL,
  joined_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_player (session_id, player_name)
);
-- If the table already exists: CREATE TABLE IF NOT EXISTS trivia_players ...

CREATE TABLE IF NOT EXISTS trivia_answers (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  session_id       INT NOT NULL,
  question_index   INT NOT NULL,
  player_name      VARCHAR(100) NOT NULL,
  answer           VARCHAR(1) NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_answer (session_id, question_index, player_name)
);

-- Bingo game tables
CREATE TABLE IF NOT EXISTS bingo_sessions (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  status                 ENUM('active','finished') NOT NULL DEFAULT 'active',
  word_bank              MEDIUMTEXT NOT NULL,
  call_interval_seconds  INT NOT NULL DEFAULT 15,
  created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bingo_called_words (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  session_id  INT NOT NULL,
  word        VARCHAR(200) NOT NULL,
  call_order  INT NOT NULL,
  called_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bingo_session (session_id)
);

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
);

-- Public event sign-up / "what I'm bringing" tables.
-- NOTE: these are also auto-created and seeded on first use by src/lib/signups.ts,
-- so running this manually is optional.
CREATE TABLE IF NOT EXISTS signup_events (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  emoji       VARCHAR(8)   NOT NULL DEFAULT '',
  title       VARCHAR(200) NOT NULL,
  date_label  VARCHAR(100) NOT NULL DEFAULT '',
  description TEXT,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS signup_contributions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  event_id    INT          NOT NULL,
  name        VARCHAR(100) NOT NULL,
  item        VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_signup_event (event_id)
);
