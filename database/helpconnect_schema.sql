-- ============================================================================
-- HELP Connect: complete schema (all use cases in one file).
-- Creates the database and every table, in dependency order. Safe to re-run (IF NOT EXISTS).
--
--   Use Case 1 (Coel): User, Category, Skills, Volunteer, Volunteer_Category, Volunteer_Skill
--   Use Case 2 (Law):  Support_request
--   Use Case 3 (Zu Yuan): Support_session, Feedback, Notification
--
-- Fresh setup:   schema (this file)  ->  helpconnect_seed.sql
-- Wipe and redo: database/helpconnect_reset.sql, then the two files above.
-- This file already contains the changes of usecase3_integration.sql and usecase3_add_description.sql,
-- so a fresh database does NOT need those patches.
-- ============================================================================
CREATE DATABASE IF NOT EXISTS help_connect;
USE help_connect;

-- ------------------------------ Use Case 1 ---------------------------------
CREATE TABLE IF NOT EXISTS User (
  User_id INT PRIMARY KEY AUTO_INCREMENT,
  User_name VARCHAR(50) NOT NULL,
  Email VARCHAR(50) UNIQUE NOT NULL,
  Password VARCHAR(255) NOT NULL,
  Verification_code VARCHAR(6),
  Verification_expiry DATETIME,
  Account_status ENUM('Unverified','Active','Suspended') DEFAULT 'Unverified',
  Profile_picture VARCHAR(250) DEFAULT 'default_profilepic.png',
  Created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Category (
  Category_id INT PRIMARY KEY AUTO_INCREMENT,
  Category_name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS Skills (
  Skills_id INT PRIMARY KEY AUTO_INCREMENT,
  Skill_name VARCHAR(50) NOT NULL,
  Category_id INT,
  FOREIGN KEY (Category_id) REFERENCES Category(Category_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS Volunteer (
  Volunteer_id INT PRIMARY KEY AUTO_INCREMENT,
  User_id INT NOT NULL,
  Availability VARCHAR(150),
  Preferred_Support_Mode ENUM('Virtual','Face-to-Face','Both') DEFAULT 'Both',
  Bio VARCHAR(255),
  FOREIGN KEY (User_id) REFERENCES User(User_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Volunteer_Category (
  Volunteer_id INT,
  Category_id INT,
  PRIMARY KEY (Volunteer_id, Category_id),
  FOREIGN KEY (Volunteer_id) REFERENCES Volunteer(Volunteer_id) ON DELETE CASCADE,
  FOREIGN KEY (Category_id) REFERENCES Category(Category_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Volunteer_Skill (
  Volunteer_id INT,
  Skills_id INT,
  PRIMARY KEY (Volunteer_id, Skills_id),
  FOREIGN KEY (Volunteer_id) REFERENCES Volunteer(Volunteer_id) ON DELETE CASCADE,
  FOREIGN KEY (Skills_id) REFERENCES Skills(Skills_id) ON DELETE CASCADE
);

-- ------------------------------ Use Case 2 ---------------------------------
-- Volunteer_id here is the Volunteer TABLE id (not the User id).
CREATE TABLE IF NOT EXISTS Support_request (
  Request_id INT PRIMARY KEY AUTO_INCREMENT,
  User_id INT NOT NULL,
  Volunteer_id INT NULL,
  Category_id INT NOT NULL,
  Description VARCHAR(255) NOT NULL,
  Preferred_date DATE NOT NULL,
  Preferred_time VARCHAR(50) NOT NULL,
  Support_mode ENUM('Virtual','Face-to-Face') NOT NULL,
  Request_status ENUM('Pending','Accepted','Rejected','Cancelled','Completed') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (User_id) REFERENCES User(User_id) ON DELETE RESTRICT,
  FOREIGN KEY (Volunteer_id) REFERENCES Volunteer(Volunteer_id) ON DELETE SET NULL,
  FOREIGN KEY (Category_id) REFERENCES Category(Category_id) ON DELETE RESTRICT
);

-- ------------------------------ Use Case 3 ---------------------------------
-- Both people are stored as User ids. Request_id is UNIQUE: one request keeps one session row, reopened
-- if the volunteer declines and the student picks someone else. NULL is allowed (sessions without a request).
-- Active_slot is generated: while Pending/Scheduled it holds "volunteer|date|time", otherwise NULL; its UNIQUE
-- key stops a volunteer being double-booked. MySQL forbids CASCADE/SET NULL on foreign keys whose column feeds
-- a stored generated column, so the user foreign keys use RESTRICT.
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
  UNIQUE KEY uq_session_request (Request_id),
  KEY idx_session_student (Student_user_id, Session_status),
  KEY idx_session_volunteer (Volunteer_user_id, Session_status)
);

-- One review per session, rating 1 to 5, comment optional.
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

-- One row per person to tell. Other use cases can write to it too.
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
