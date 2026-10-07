CREATE DATABASE IF NOT EXISTS help_connect;
USE help_connect;

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