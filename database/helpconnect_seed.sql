-- ============================================================================
-- HELP Connect: starting data. Run after helpconnect_schema.sql. Safe to re-run.
--   1. Categories and skills (needed by registration and requests).
--   2. Three optional test users for Use Case 3's smoke test (no usable password, cannot log in).
--      Delete section 2 if you only want real accounts.
-- ============================================================================
USE help_connect;

INSERT IGNORE INTO Category (Category_id, Category_name) VALUES
  (1, 'Academic Support'),
  (2, 'Technology Support'),
  (3, 'New Student Support'),
  (4, 'General Student Support');

-- Skills has no unique key, so only insert when the table is empty (avoids duplicates on re-run).
INSERT INTO Skills (Skill_name, Category_id)
SELECT * FROM (
  SELECT 'Python' AS Skill_name, 2 AS Category_id UNION ALL SELECT 'Java', 2 UNION ALL SELECT 'Math', 1
  UNION ALL SELECT 'Physics', 1 UNION ALL SELECT 'Writing', 1 UNION ALL SELECT 'Study Techniques', 1
  UNION ALL SELECT 'Assignment Guidance', 1 UNION ALL SELECT 'Software Installation', 2
  UNION ALL SELECT 'Computer Science', 2 UNION ALL SELECT 'Student Life Guidance', 3
  UNION ALL SELECT 'AI', 2 UNION ALL SELECT 'Philosophy', 1 UNION ALL SELECT 'Assembly Language', 2
) s
WHERE NOT EXISTS (SELECT 1 FROM Skills);

-- 2. Optional test users
INSERT IGNORE INTO User (User_name, Email, Password, Account_status) VALUES
  ('Test Student', 'student.test@helplive.edu.my', '!no-login-seed-user', 'Active'),
  ('Test Volunteer', 'volunteer.test@helplive.edu.my', '!no-login-seed-user', 'Active'),
  ('Test Outsider', 'outsider.test@helplive.edu.my', '!no-login-seed-user', 'Active');
