-- Run this ONCE on your MariaDB VPS to set up the database
CREATE DATABASE IF NOT EXISTS familyreunion CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE familyreunion;

CREATE TABLE IF NOT EXISTS families (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  family_name       VARCHAR(255) NOT NULL,
  contact_name      VARCHAR(255) NOT NULL,
  rooms_requested   INT          NOT NULL DEFAULT 1,
  nights            INT          NOT NULL DEFAULT 3,
  hotel_preference  VARCHAR(100) NOT NULL DEFAULT '',
  has_pets          TINYINT(1)   NOT NULL DEFAULT 0,
  room_type         VARCHAR(50)  NOT NULL DEFAULT '',
  rsvp_status       VARCHAR(20)  NOT NULL DEFAULT 'interested',
  attendees         TEXT,
  notes             TEXT,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
