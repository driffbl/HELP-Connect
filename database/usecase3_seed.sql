-- ============================================================================
-- Test users for Use Case 3. They have no usable password, so nobody can log in as them.
-- The smoke test (backend/scripts/smoke-usecase3.js) signs its own tokens for them.
-- Safe to run more than once.
-- ============================================================================
USE help_connect;

INSERT IGNORE INTO User (User_name, Email, Password, Account_status)
VALUES ('Test Student', 'student.test@helplive.edu.my', '!no-login-seed-user', 'Active'),
       ('Test Volunteer', 'volunteer.test@helplive.edu.my', '!no-login-seed-user', 'Active'),
       ('Test Outsider', 'outsider.test@helplive.edu.my', '!no-login-seed-user', 'Active');

UPDATE User SET Account_status = 'Active'
WHERE Email IN ('student.test@helplive.edu.my', 'volunteer.test@helplive.edu.my', 'outsider.test@helplive.edu.my');
