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