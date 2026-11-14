-- ============================================================================
-- HELP Connect: DEMO SEED. Run after helpconnect_schema.sql.   (This replaces seed.sql: do not run both.)
--
-- Gives you, ready for a demo:
--   * 4 categories, 13 skills, 3 students (ids 1-3) and 10 volunteers (ids 10-19), like seed.sql
--   * every account can LOG IN with password   password123
--       (login then asks for a 6-digit code: it is printed in the BACKEND console as "CODE: 123456",
--        so no real email is needed)
--   * 12 demo requests + sessions (ids 9001-9012), ALL between two accounts so two browsers are enough:
--       Wei Yang (student)  <->  Angela Smarts (volunteer)      (Alex Tan is an optional third browser)
--
-- Safe to re-run any time: it rebuilds ONLY the demo requests/sessions (ids 9001+), and moves their dates
-- to "now" again, so run it again just before a presentation.
--
-- Demo logins (password123):  weiyang@help.edu.my = STUDENT      angela.smarts@help.edu.my = VOLUNTEER
--                             alextan@help.edu.my  = optional 3rd, a volunteer Wei Yang can pick instead of Angela
-- ============================================================================
USE help_connect;

-- 1. Categories and skills ---------------------------------------------------
INSERT IGNORE INTO Category (Category_id, Category_name) VALUES
  (1, 'Academic Support'), (2, 'Technology Support'), (3, 'New Student Support'), (4, 'General Student Support');

-- Skills has no unique key, so each skill is added only if its name is not there yet.
INSERT INTO Skills (Skill_name, Category_id)
SELECT t.n, t.c FROM (
  SELECT 'Python' n, 2 c UNION ALL SELECT 'Java', 2 UNION ALL SELECT 'Math', 1 UNION ALL SELECT 'Physics', 1
  UNION ALL SELECT 'Writing', 1 UNION ALL SELECT 'Study Techniques', 1 UNION ALL SELECT 'Assignment Guidance', 1
  UNION ALL SELECT 'Software Installation', 2 UNION ALL SELECT 'Computer Science', 2
  UNION ALL SELECT 'Student Life Guidance', 3 UNION ALL SELECT 'AI', 2 UNION ALL SELECT 'Philosophy', 1
  UNION ALL SELECT 'Assembly Language', 2
) t WHERE NOT EXISTS (SELECT 1 FROM Skills x WHERE x.Skill_name = t.n);

-- 2. Users: password for every account is  password123  (stored as a bcrypt hash, like real sign-ups) ------
INSERT INTO User (User_id, User_name, Email, Password, Account_status) VALUES
  (1,  'Wei Yang',       'weiyang@help.edu.my',        '$2b$10$b4zv9z7u.kehtfKQhn8c5uZUji6mBvCOv8fv10tlkvHbX.HGBtVmG', 'Active'),
  (2,  'John Doe',       'johndoe@help.edu.my',        '$2b$10$b4zv9z7u.kehtfKQhn8c5uZUji6mBvCOv8fv10tlkvHbX.HGBtVmG', 'Active'),
  (3,  'Ooi Sagi',       'ooisagi@help.edu.my',        '$2b$10$b4zv9z7u.kehtfKQhn8c5uZUji6mBvCOv8fv10tlkvHbX.HGBtVmG', 'Active'),
  (10, 'Angela Smarts',  'angela.smarts@help.edu.my',  '$2b$10$b4zv9z7u.kehtfKQhn8c5uZUji6mBvCOv8fv10tlkvHbX.HGBtVmG', 'Active'),
  (11, 'Jane Smith',     'janesmith@help.edu.my',      '$2b$10$b4zv9z7u.kehtfKQhn8c5uZUji6mBvCOv8fv10tlkvHbX.HGBtVmG', 'Active'),
  (12, 'Johnny John',    'johnny.john@help.edu.my',    '$2b$10$b4zv9z7u.kehtfKQhn8c5uZUji6mBvCOv8fv10tlkvHbX.HGBtVmG', 'Active'),
  (13, 'Alex Tan',       'alextan@help.edu.my',        '$2b$10$b4zv9z7u.kehtfKQhn8c5uZUji6mBvCOv8fv10tlkvHbX.HGBtVmG', 'Active'),
  (14, 'Sarah Lee',      'sarahlee@help.edu.my',       '$2b$10$b4zv9z7u.kehtfKQhn8c5uZUji6mBvCOv8fv10tlkvHbX.HGBtVmG', 'Active'),
  (15, 'Marcus Wong',    'marcuswong@help.edu.my',     '$2b$10$b4zv9z7u.kehtfKQhn8c5uZUji6mBvCOv8fv10tlkvHbX.HGBtVmG', 'Active'),
  (16, 'Priya Sharma',   'priya.sharma@help.edu.my',   '$2b$10$b4zv9z7u.kehtfKQhn8c5uZUji6mBvCOv8fv10tlkvHbX.HGBtVmG', 'Active'),
  (17, 'Daniel Bryan',   'daniel.bryan@help.edu.my',   '$2b$10$b4zv9z7u.kehtfKQhn8c5uZUji6mBvCOv8fv10tlkvHbX.HGBtVmG', 'Active'),
  (18, 'Chloe Lim',      'chloe.lim@help.edu.my',      '$2b$10$b4zv9z7u.kehtfKQhn8c5uZUji6mBvCOv8fv10tlkvHbX.HGBtVmG', 'Active'),
  (19, 'Muhammad Haris', 'm.haris@help.edu.my',        '$2b$10$b4zv9z7u.kehtfKQhn8c5uZUji6mBvCOv8fv10tlkvHbX.HGBtVmG', 'Active')
ON DUPLICATE KEY UPDATE User_name = VALUES(User_name), Password = VALUES(Password), Account_status = 'Active';

-- 3. Volunteer profiles (Volunteer_id = User_id for these) ----------------------------------------------
INSERT INTO Volunteer (Volunteer_id, User_id, Availability, Preferred_Support_Mode, Bio) VALUES
  (10, 10, 'Tuesdays and Thursdays (12pm to 3pm)', 'Both', 'Year 3 Software Engineering peer mentor specializing in OOP and algorithms.'),
  (11, 11, 'Mondays and Thursdays (2pm to 3pm)', 'Face-to-Face', 'Marketing senior assisting new students with campus transition and presentations.'),
  (12, 12, 'Mondays and Wednesdays (12pm to 2pm)', 'Virtual', 'Tech enthusiast helping with IDE installations, Git, and Linux terminal setup.'),
  (13, 13, 'Monday, Wednesday and Thursday (10am to 12pm)', 'Both', 'Computer Science peer tutor specializing in Java, Python, and Discrete Math.'),
  (14, 14, 'Tuesdays and Thursdays (10:00 - 12:00)', 'Virtual', 'Full-stack web developer ready to help with Node.js and MySQL database troubleshooting.'),
  (15, 15, 'Fridays and Saturdays (2pm to 5pm)', 'Face-to-Face', 'Senior student offering guidance on campus facilities, clubs, and enrollment.'),
  (16, 16, 'Wednesdays and Thursdays (9am to 12pm)', 'Both', 'Academic writing and research methodology mentor for undergraduate projects.'),
  (17, 17, 'Mondays and Fridays (11am to 1pm)', 'Virtual', 'Hardware and networking troubleshooting specialist assisting with HELP WiFi/VPN.'),
  (18, 18, 'Thursdays and Fridays (1pm to 4pm)', 'Both', 'Peer counselor providing general study time-management and stress relief tips.'),
  (19, 19, 'Tuesdays and Wednesdays (3pm to 6pm)', 'Face-to-Face', 'Senior ambassador providing onboarding assistance and campus tour guidance.')
ON DUPLICATE KEY UPDATE Availability = VALUES(Availability), Bio = VALUES(Bio);

INSERT IGNORE INTO Volunteer_Category (Volunteer_id, Category_id) VALUES
  (10,1),(10,2),(11,1),(11,3),(12,2),(13,1),(14,1),(14,2),(15,3),(16,1),(16,4),(17,2),(18,4),(19,3);

-- A few skills per volunteer, looked up by name so the ids never matter.
INSERT IGNORE INTO Volunteer_Skill (Volunteer_id, Skills_id)
SELECT m.v, s.Skills_id FROM (
  SELECT 10 v, 'Python' n UNION ALL SELECT 10, 'Java' UNION ALL SELECT 10, 'Computer Science'
  UNION ALL SELECT 13, 'Math' UNION ALL SELECT 13, 'Java' UNION ALL SELECT 13, 'Assignment Guidance'
  UNION ALL SELECT 14, 'Python' UNION ALL SELECT 14, 'Software Installation'
  UNION ALL SELECT 12, 'Software Installation' UNION ALL SELECT 12, 'Computer Science'
  UNION ALL SELECT 15, 'Student Life Guidance' UNION ALL SELECT 19, 'Student Life Guidance'
  UNION ALL SELECT 16, 'Writing' UNION ALL SELECT 16, 'Study Techniques'
) m JOIN Skills s ON s.Skill_name = m.n;

-- 4. Demo requests, sessions, reviews, notifications (all Wei Yang <-> Angela Smarts) --------------------
-- Clear the previous demo rows first (sessions go first; their feedback and notifications cascade).
DELETE FROM Support_session WHERE Session_id >= 9001;
DELETE FROM Support_request WHERE Request_id >= 9001;

-- "Now", with the seconds cut off, so every time below is a clean HH:MM.
SET @now = DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:00');
-- The next Thursday 10:30: Alex Tan, Sarah Lee and Priya Sharma are all free then (Academic Support, virtual),
-- so "Choose another volunteer" on the declined request really finds people.
SET @thu = TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL IF(MOD(5 - DAYOFWEEK(CURDATE()) + 7, 7) = 0, 7, MOD(5 - DAYOFWEEK(CURDATE()) + 7, 7)) DAY), '10:30:00');

-- When each session is (or was). Angela never has two active sessions at the same minute.
SET @t9001 = DATE_ADD(@now, INTERVAL 1440 MINUTE);    -- Pending, tomorrow
SET @t9002 = DATE_ADD(@now, INTERVAL 4320 MINUTE);    -- Pending, in 3 days
SET @t9003 = DATE_ADD(@now, INTERVAL 2880 MINUTE);    -- Scheduled, in 2 days
SET @t9004 = DATE_SUB(@now, INTERVAL 60 MINUTE);      -- Scheduled, started an hour ago (can be completed)
SET @t9005 = DATE_SUB(@now, INTERVAL 4320 MINUTE);
SET @t9006 = DATE_SUB(@now, INTERVAL 8640 MINUTE);
SET @t9007 = DATE_SUB(@now, INTERVAL 12960 MINUTE);   -- Completed, no review yet
SET @t9008 = DATE_SUB(@now, INTERVAL 17280 MINUTE);
SET @t9009 = DATE_SUB(@now, INTERVAL 2880 MINUTE);    -- Cancelled by the student
SET @t9010 = @thu;                                    -- Declined by Angela: the student can choose another
SET @t9011 = DATE_SUB(@now, INTERVAL 21600 MINUTE);
SET @t9012 = DATE_SUB(@now, INTERVAL 7200 MINUTE);    -- Cancelled by the volunteer

-- Requests (Volunteer_id is the Volunteer table id: Angela = 10; student user 1 = Wei Yang)
INSERT INTO Support_request (Request_id, User_id, Volunteer_id, Category_id, Description, Preferred_date, Preferred_time, Support_mode, Request_status, created_at) VALUES
  (9001, 1, 10, 1, 'Need help understanding loops and functions in Python.',  DATE(@t9001), DATE_FORMAT(@t9001,'%H:%i'), 'Virtual',      'Pending',   DATE_SUB(@now, INTERVAL 30 MINUTE)),
  (9002, 1, 10, 2, 'Help setting up my laptop for the coding lab.',           DATE(@t9002), DATE_FORMAT(@t9002,'%H:%i'), 'Face-to-Face', 'Pending',   DATE_SUB(@now, INTERVAL 2 HOUR)),
  (9003, 1, 10, 1, 'Revision for the discrete maths assignment.',             DATE(@t9003), DATE_FORMAT(@t9003,'%H:%i'), 'Virtual',      'Accepted',  DATE_SUB(@now, INTERVAL 1 DAY)),
  (9004, 1, 10, 2, 'Debugging my Java project before submission.',            DATE(@t9004), DATE_FORMAT(@t9004,'%H:%i'), 'Virtual',      'Accepted',  DATE_SUB(@now, INTERVAL 2 DAY)),
  (9005, 1, 10, 1, 'Algorithms revision: sorting and recursion.',             DATE(@t9005), DATE_FORMAT(@t9005,'%H:%i'), 'Virtual',      'Completed', DATE_SUB(@now, INTERVAL 6 DAY)),
  (9006, 1, 10, 2, 'Installing Python and VS Code on my laptop.',             DATE(@t9006), DATE_FORMAT(@t9006,'%H:%i'), 'Face-to-Face', 'Completed', DATE_SUB(@now, INTERVAL 10 DAY)),
  (9007, 1, 10, 1, 'Object-oriented programming concepts.',                   DATE(@t9007), DATE_FORMAT(@t9007,'%H:%i'), 'Virtual',      'Completed', DATE_SUB(@now, INTERVAL 14 DAY)),
  (9008, 1, 10, 1, 'Calculus past-year paper walkthrough.',                   DATE(@t9008), DATE_FORMAT(@t9008,'%H:%i'), 'Virtual',      'Completed', DATE_SUB(@now, INTERVAL 18 DAY)),
  (9009, 1, 10, 2, 'Setting up Node.js and MySQL for my assignment.',         DATE(@t9009), DATE_FORMAT(@t9009,'%H:%i'), 'Virtual',      'Cancelled', DATE_SUB(@now, INTERVAL 4 DAY)),
  (9010, 1, 10, 1, 'Help with assignment structure and referencing.',         DATE(@t9010), DATE_FORMAT(@t9010,'%H:%i'), 'Virtual',      'Rejected',  DATE_SUB(@now, INTERVAL 1 DAY)),
  (9011, 1, 10, 1, 'Exam preparation tips and a study timetable.',            DATE(@t9011), DATE_FORMAT(@t9011,'%H:%i'), 'Virtual',      'Completed', DATE_SUB(@now, INTERVAL 22 DAY)),
  (9012, 1, 10, 1, 'Group project planning advice.',                          DATE(@t9012), DATE_FORMAT(@t9012,'%H:%i'), 'Face-to-Face', 'Cancelled', DATE_SUB(@now, INTERVAL 7 DAY));

-- Sessions, one per request (same ids). Student/volunteer here are USER ids. Title = category, as the app does.
INSERT INTO Support_session (Session_id, Request_id, Student_user_id, Volunteer_user_id, Title, Description, Category, Session_date, Session_time, Support_mode, Session_status, Proposed_by, Created_at) VALUES
  (9001, 9001, 1, 10, 'Academic Support',   'Need help understanding loops and functions in Python.',  'Academic Support',   DATE(@t9001), TIME(@t9001), 'Virtual',      'Pending',   'student', DATE_SUB(@now, INTERVAL 30 MINUTE)),
  (9002, 9002, 1, 10, 'Technology Support', 'Help setting up my laptop for the coding lab.',           'Technology Support', DATE(@t9002), TIME(@t9002), 'Face-to-Face', 'Pending',   'student', DATE_SUB(@now, INTERVAL 2 HOUR)),
  (9003, 9003, 1, 10, 'Academic Support',   'Revision for the discrete maths assignment.',             'Academic Support',   DATE(@t9003), TIME(@t9003), 'Virtual',      'Scheduled', NULL,      DATE_SUB(@now, INTERVAL 1 DAY)),
  (9004, 9004, 1, 10, 'Technology Support', 'Debugging my Java project before submission.',            'Technology Support', DATE(@t9004), TIME(@t9004), 'Virtual',      'Scheduled', NULL,      DATE_SUB(@now, INTERVAL 2 DAY)),
  (9005, 9005, 1, 10, 'Academic Support',   'Algorithms revision: sorting and recursion.',             'Academic Support',   DATE(@t9005), TIME(@t9005), 'Virtual',      'Completed', NULL,      DATE_SUB(@now, INTERVAL 6 DAY)),
  (9006, 9006, 1, 10, 'Technology Support', 'Installing Python and VS Code on my laptop.',             'Technology Support', DATE(@t9006), TIME(@t9006), 'Face-to-Face', 'Completed', NULL,      DATE_SUB(@now, INTERVAL 10 DAY)),
  (9007, 9007, 1, 10, 'Academic Support',   'Object-oriented programming concepts.',                   'Academic Support',   DATE(@t9007), TIME(@t9007), 'Virtual',      'Completed', NULL,      DATE_SUB(@now, INTERVAL 14 DAY)),
  (9008, 9008, 1, 10, 'Academic Support',   'Calculus past-year paper walkthrough.',                   'Academic Support',   DATE(@t9008), TIME(@t9008), 'Virtual',      'Completed', NULL,      DATE_SUB(@now, INTERVAL 18 DAY)),
  (9009, 9009, 1, 10, 'Technology Support', 'Setting up Node.js and MySQL for my assignment.',         'Technology Support', DATE(@t9009), TIME(@t9009), 'Virtual',      'Cancelled', NULL,      DATE_SUB(@now, INTERVAL 4 DAY)),
  (9010, 9010, 1, 10, 'Academic Support',   'Help with assignment structure and referencing.',         'Academic Support',   DATE(@t9010), TIME(@t9010), 'Virtual',      'Cancelled', NULL,      DATE_SUB(@now, INTERVAL 1 DAY)),
  (9011, 9011, 1, 10, 'Academic Support',   'Exam preparation tips and a study timetable.',            'Academic Support',   DATE(@t9011), TIME(@t9011), 'Virtual',      'Completed', NULL,      DATE_SUB(@now, INTERVAL 22 DAY)),
  (9012, 9012, 1, 10, 'Academic Support',   'Group project planning advice.',                          'Academic Support',   DATE(@t9012), TIME(@t9012), 'Face-to-Face', 'Cancelled', NULL,      DATE_SUB(@now, INTERVAL 7 DAY));

-- Reviews (session 9007 is left without one, so the student can leave feedback live). Angela averages 4.3.
INSERT INTO Feedback (Session_id, Rating, Comments, Created_at) VALUES
  (9005, 5, 'Very clear explanations, helped me a lot.',        DATE_ADD(@t9005, INTERVAL 2 HOUR)),
  (9006, 4, 'Good session, fixed everything on my laptop.',     DATE_ADD(@t9006, INTERVAL 2 HOUR)),
  (9008, 3, 'Okay, but I needed more worked examples.',         DATE_ADD(@t9008, INTERVAL 2 HOUR)),
  (9011, 5, 'Great tips, my timetable finally makes sense.',    DATE_ADD(@t9011, INTERVAL 2 HOUR));

-- Notifications (the bell). Some unread, some read.
INSERT INTO Notification (User_id, Session_id, Message, Notification_status, Created_at) VALUES
  (10, 9001, CONCAT('Wei Yang requested "Academic Support" on ', DATE(@t9001), ' at ', DATE_FORMAT(@t9001,'%H:%i'), '.'),   'Unread', DATE_SUB(@now, INTERVAL 30 MINUTE)),
  (10, 9002, CONCAT('Wei Yang requested "Technology Support" on ', DATE(@t9002), ' at ', DATE_FORMAT(@t9002,'%H:%i'), '.'), 'Unread', DATE_SUB(@now, INTERVAL 2 HOUR)),
  (1,  9003, 'Angela Smarts accepted your request "Academic Support". The session is scheduled.',                'Unread', DATE_SUB(@now, INTERVAL 20 HOUR)),
  (1,  9010, 'Angela Smarts declined your request "Academic Support". You can choose another volunteer.',        'Unread', DATE_SUB(@now, INTERVAL 5 HOUR)),
  (1,  9007, 'Your session "Academic Support" was completed. Please leave feedback.',                            'Unread', DATE_SUB(@now, INTERVAL 13 DAY)),
  (1,  9005, 'Your session "Academic Support" was completed. Please leave feedback.',                            'Read',   DATE_SUB(@now, INTERVAL 3 DAY)),
  (10, 9009, 'Wei Yang cancelled "Technology Support".',                                                         'Read',   DATE_SUB(@now, INTERVAL 2 DAY));
