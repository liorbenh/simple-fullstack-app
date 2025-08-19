-- Database initialization script for TiDB

-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS sre_test;
USE sre_test;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_username (username)
);

-- User tokens table for JWT management
CREATE TABLE IF NOT EXISTS user_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token_hash (token_hash),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);

-- User activities table for audit logging
CREATE TABLE IF NOT EXISTS user_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    additional_data JSON,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_timestamp (timestamp)
);

-- Insert default admin user
-- Password: admin123 (hashed with bcrypt)
INSERT IGNORE INTO users (email, username, password_hash) 
VALUES ('admin@test.com', 'admin', '$2b$10$8K1p/a0dCVV6fnfHsavJ4u8g7X5.rYc.T8JlXJQr4.Y8fRqZpQKKq');

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_expires ON user_tokens(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_activities_user_timestamp ON user_activities(user_id, timestamp);
