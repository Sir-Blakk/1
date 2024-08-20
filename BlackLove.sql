-- Create the database
CREATE DATABASE BlackLove;

-- Use the database
USE BlackLove;

-- Table to store members' basic information
CREATE TABLE Members (
    member_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    gender ENUM('Male', 'Female', 'Other'),
    date_of_birth DATE,
    joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (email)
);

-- Table to store members' profile information
CREATE TABLE Profiles (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT UNIQUE,  -- Ensuring one-to-one relationship
    bio TEXT,
    interests TEXT,
    profile_picture VARCHAR(255),
    FOREIGN KEY (member_id) REFERENCES Members(member_id) ON DELETE CASCADE
);

-- Table to store member messages
CREATE TABLE Messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT,
    receiver_id INT,
    message_content TEXT,
    sent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (sender_id) REFERENCES Members(member_id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES Members(member_id) ON DELETE CASCADE
);

-- Table to store member settings
CREATE TABLE Settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT UNIQUE,
    receive_notifications BOOLEAN DEFAULT TRUE,
    receive_emails BOOLEAN DEFAULT TRUE,
    privacy_setting ENUM('Public', 'Private') DEFAULT 'Public',
    FOREIGN KEY (member_id) REFERENCES Members(member_id) ON DELETE CASCADE
);

-- Table to store additional photos for profiles
CREATE TABLE ProfilePhotos (
    photo_id INT AUTO_INCREMENT PRIMARY KEY,
    profile_id INT,
    photo_path VARCHAR(255),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profile_id) REFERENCES Profiles(profile_id) ON DELETE CASCADE
);

-- Example to insert a new member
INSERT INTO Members (username, email, password_hash, first_name, last_name, gender, date_of_birth)
VALUES ('john_doe', 'john@example.com', 'hashed_password_here', 'John', 'Doe', 'Male', '1990-01-15');

-- Example to insert a profile for a member
INSERT INTO Profiles (member_id, bio, interests, profile_picture)
VALUES (1, 'I love outdoor adventures and meeting new people.', 'Hiking, Photography, Traveling', '/images/profile_pics/john_doe.jpg');
