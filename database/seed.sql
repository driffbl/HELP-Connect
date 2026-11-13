USE help_connect;

-- 1. Insert Categories (Ignores duplicates if they already exist)
INSERT IGNORE INTO Category (Category_id, Category_name) VALUES 
(1, 'Academic Support'),
(2, 'Technology Support'),
(3, 'New Student Support'),
(4, 'General Student Support');

-- 2. Insert Skills
INSERT IGNORE INTO Skills (Skill_name, Category_id) VALUES 
('Python', 2),
('Java', 2),
('Math', 1),
('Physics', 1),
('Writing', 1),
('Study Techniques', 1),
('Assignment Guidance', 1),
('Software Installation', 2),
('Computer Science', 2),
('Student Life Guidance', 3),
('AI', 2),
('Philosophy', 1),
('Assembly Language', 2);
       
-- ============================================================================
-- 2. SEED USERS (Students & Volunteers)
-- Password for all accounts: 'password123'
-- ============================================================================
INSERT INTO User (User_id, User_name, Email, Password, Account_status) VALUES
-- Dedicated Students (For testing student login & submitting requests)
(1, 'Wei Yang', 'weiyang@help.edu.my', 'password123', 'Active'),
(2, 'John Doe', 'johndoe@help.edu.my', 'password123', 'Active'),
(3, 'Ooi Sagi', 'ooisagi@help.edu.my', 'password123', 'Active'),

-- Volunteers (User_id 10 to 19)
(10, 'Angela Smarts', 'angela.smarts@help.edu.my', 'password123', 'Active'),
(11, 'Jane Smith', 'janesmith@help.edu.my', 'password123', 'Active'),
(12, 'Johnny John', 'johnny.john@help.edu.my', 'password123', 'Active'),
(13, 'Alex Tan', 'alextan@help.edu.my', 'password123', 'Active'),
(14, 'Sarah Lee', 'sarahlee@help.edu.my', 'password123', 'Active'),
(15, 'Marcus Wong', 'marcuswong@help.edu.my', 'password123', 'Active'),
(16, 'Priya Sharma', 'priya.sharma@help.edu.my', 'password123', 'Active'),
(17, 'Daniel Bryan', 'daniel.bryan@help.edu.my', 'password123', 'Active'),
(18, 'Chloe Lim', 'chloe.lim@help.edu.my', 'password123', 'Active'),
(19, 'Muhammad Haris', 'm.haris@help.edu.my', 'password123', 'Active')
    ON DUPLICATE KEY UPDATE User_name = VALUES(User_name), Password = VALUES(Password);

-- ============================================================================
-- 3. SEED VOLUNTEER PROFILES
-- Matches Volunteer_id 10 to 19 with User_id 10 to 19
-- ============================================================================
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

-- ============================================================================
-- 4. LINK VOLUNTEERS TO CATEGORIES (Volunteer_Category Junction)
-- ============================================================================
INSERT IGNORE INTO Volunteer_Category (Volunteer_id, Category_id) VALUES
  -- Angela Smarts: Academic & Tech
  (10, 1),
  (10, 2),
  -- Jane Smith: Academic & New Student
  (11, 1),
  (11, 3),
  -- Johnny John: Tech
  (12, 2),
  -- Alex Tan: Academic
  (13, 1),
  -- Sarah Lee: Tech & Academic
  (14, 1),
  (14, 2),
  -- Marcus Wong: New Student Support
  (15, 3),
  -- Priya Sharma: Academic & General
  (16, 1),
  (16, 4),
  -- Daniel Bryan: Technology Support
  (17, 2),
  -- Chloe Lim: General Student Support
  (18, 4),
  -- Muhammad Haris: New Student Support
  (19, 3);