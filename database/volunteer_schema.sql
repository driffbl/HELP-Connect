USE help_connect;

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

-- Seed categories (only inserts if they don't already exist)
INSERT IGNORE INTO Category (Category_name) VALUES
  ('Academic Support'),
  ('Technology Support'),
  ('New Student Support'),
  ('General Student Support');