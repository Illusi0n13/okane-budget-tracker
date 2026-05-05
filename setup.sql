-- Okane Budget Tracker — Database Schema
-- Run this manually OR let app.py auto-create it on first run

CREATE DATABASE IF NOT EXISTS okane_tracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE okane_tracker;

CREATE TABLE IF NOT EXISTS users (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    username     VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(64) NOT NULL,
    display_name VARCHAR(100),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monthly_budgets (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL,
    month        VARCHAR(7)   NOT NULL,          -- format: YYYY-MM
    total_budget DECIMAL(12,2) NOT NULL DEFAULT 0,
    UNIQUE KEY uniq_user_month (user_id, month),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS entries (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    month      VARCHAR(7)   NOT NULL,             -- format: YYYY-MM
    entry_type ENUM('expense','income') NOT NULL DEFAULT 'expense',
    category   VARCHAR(50)  NOT NULL,
    description VARCHAR(255),
    amount     DECIMAL(12,2) NOT NULL,
    entry_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_month (user_id, month),
    INDEX idx_user_date  (user_id, entry_date)
);
