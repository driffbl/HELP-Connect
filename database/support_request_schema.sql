USE help_connect;

CREATE TABLE IF NOT EXISTS Support_request (
    Request_id INT PRIMARY KEY AUTO_INCREMENT,
    User_id INT NOT NULL,
    Volunteer_id INT NULL,
    Category_id INT NOT NULL,
    Description VARCHAR(255) NOT NULL,
    Preferred_date DATE NOT NULL,
    Preferred_time VARCHAR(50) NOT NULL,
    Support_mode ENUM('Virtual', 'Face-to-Face') NOT NULL,
    Request_status ENUM('Pending', 'Accepted', 'Rejected') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (User_id) REFERENCES User(User_id) ON DELETE RESTRICT,
    FOREIGN KEY (Volunteer_id) REFERENCES Volunteer(Volunteer_id) ON DELETE SET NULL,
    FOREIGN KEY (Category_id) REFERENCES Category(Category_id) ON DELETE RESTRICT
    );