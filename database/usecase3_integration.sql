-- ============================================================================
-- Use Case 3 <-> Use Case 2 integration (run ONCE on an existing database).
--
-- 1. Support_request.Request_status gets two more values, so a student cancelling a session
--    (or a volunteer completing it) can be written back to the request.
-- 2. Support_session.Request_id becomes UNIQUE: one request keeps one session row. When a volunteer
--    declines and the student picks someone else, the SAME row is reopened for the new volunteer.
--    (MySQL allows many NULLs in a UNIQUE key, so demo sessions without a request are fine.)
--
-- Run:  Get-Content database\usecase3_integration.sql | & $mysql -u root -p help_connect
-- ============================================================================
USE help_connect;

ALTER TABLE Support_request
  MODIFY Request_status ENUM('Pending','Accepted','Rejected','Cancelled','Completed') NOT NULL DEFAULT 'Pending';

ALTER TABLE Support_session
  ADD CONSTRAINT uq_session_request UNIQUE (Request_id);
