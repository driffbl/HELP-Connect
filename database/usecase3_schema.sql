-- ============================================================================
-- Use Case 3: Manage Support Session and Provide Feedback
-- Tables: Support_session, Feedback, Notification
--
-- Run order:  1) schema.sql (creates the database and User)
--             2) this file
--             3) usecase3_seed.sql (optional test users)
--
-- This file is separate from schema.sql on purpose, so it does not conflict with teammates' edits.
-- It only depends on the existing `User` table.
-- ============================================================================
USE help_connect;

-- ----------------------------------------------------------------------------
-- Support_session
--   Both people are stored as User ids (a volunteer is a User who volunteers).
--   Request_id is for the Support Request table (Use Case 2). It has no foreign key yet because that
--   table does not exist; add one when it does.
--   Category is plain text until a Category table exists.
--
--   Active_slot is generated: while a session is Pending or Scheduled it holds
--   "volunteer|date|time", otherwise NULL. The UNIQUE key on it means a volunteer cannot have two
--   Pending/Scheduled sessions at the same time, and a Cancelled or Completed session frees the slot.
--   MySQL forbids CASCADE / SET NULL on a foreign key whose column feeds a stored generated column,
--   so the user foreign keys use RESTRICT.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Support_session (
  Session_id INT PRIMARY KEY AUTO_INCREMENT,
  Request_id INT NULL,
  Student_user_id INT NOT NULL,
  Volunteer_user_id INT NOT NULL,
  Title VARCHAR(100) NOT NULL,
  Description VARCHAR(255) NULL,
  Category VARCHAR(50) NOT NULL,
  Session_date DATE NOT NULL,
  Session_time TIME NOT NULL,
  Support_mode ENUM('Virtual','Face-to-Face') NOT NULL,
  Session_status ENUM('Pending','Scheduled','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  Proposed_by ENUM('student','volunteer') NULL,
  Created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  Active_slot VARCHAR(40) GENERATED ALWAYS AS (
    CASE WHEN Session_status IN ('Pending','Scheduled')
         THEN CONCAT(Volunteer_user_id, '|', Session_date, '|', Session_time)
         ELSE NULL END
  ) STORED,
  CONSTRAINT fk_session_student FOREIGN KEY (Student_user_id) REFERENCES User(User_id) ON DELETE RESTRICT,
  CONSTRAINT fk_session_volunteer FOREIGN KEY (Volunteer_user_id) REFERENCES User(User_id) ON DELETE RESTRICT,
  UNIQUE KEY uq_volunteer_active_slot (Active_slot),
  KEY idx_session_student (Student_user_id, Session_status),
  KEY idx_session_volunteer (Volunteer_user_id, Session_status)
);

-- ----------------------------------------------------------------------------
-- Feedback: one review per session (the UNIQUE key), rating 1 to 5, comment optional.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Feedback (
  Feedback_id INT PRIMARY KEY AUTO_INCREMENT,
  Session_id INT NOT NULL,
  Rating TINYINT NOT NULL,
  Comments VARCHAR(255) NULL,
  Created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_feedback_session FOREIGN KEY (Session_id) REFERENCES Support_session(Session_id) ON DELETE CASCADE,
  CONSTRAINT uq_feedback_session UNIQUE (Session_id),
  CONSTRAINT chk_feedback_rating CHECK (Rating BETWEEN 1 AND 5)
);

-- ----------------------------------------------------------------------------
-- Notification: one row per person to tell. Other use cases can write to it too.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Notification (
  Notification_id INT PRIMARY KEY AUTO_INCREMENT,
  User_id INT NOT NULL,
  Session_id INT NULL,
  Message VARCHAR(255) NOT NULL,
  Notification_status ENUM('Unread','Read') NOT NULL DEFAULT 'Unread',
  Created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_user FOREIGN KEY (User_id) REFERENCES User(User_id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_session FOREIGN KEY (Session_id) REFERENCES Support_session(Session_id) ON DELETE CASCADE,
  KEY idx_notification_user (User_id, Notification_status, Created_at)
);
