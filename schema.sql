-- =============================================
--  BudgetWise — Database Schema
--  Run this SQL in your phpMyAdmin
--  Database > SQL tab > paste and execute
-- =============================================

-- 1. Create the database (if not already created)
CREATE DATABASE IF NOT EXISTS `budgetwise`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `budgetwise`;

-- 2. Users table
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `firstname`  VARCHAR(80)  NOT NULL,
  `lastname`   VARCHAR(80)  NOT NULL DEFAULT '',
  `email`      VARCHAR(180) NOT NULL UNIQUE,
  `password`   VARCHAR(255) NOT NULL,          -- bcrypt hash
  `currency`   VARCHAR(10)  NOT NULL DEFAULT 'RWF',
  `country`    VARCHAR(100) NOT NULL DEFAULT 'Rwanda',
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- 3. Budget plans table
CREATE TABLE IF NOT EXISTS `budget_plans` (
  `id`                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`            INT UNSIGNED NOT NULL,
  `plan_name`          VARCHAR(150) NOT NULL,
  `period`             ENUM('monthly','weekly','annual') NOT NULL DEFAULT 'monthly',
  `income_type`        VARCHAR(60)  NOT NULL DEFAULT 'salary',
  `income`             DECIMAL(15,2) NOT NULL,
  `currency`           VARCHAR(10)  NOT NULL DEFAULT 'RWF',
  `expenses`           JSON         NOT NULL,  -- array of {key,label,percentage,amount}
  `total_expenses`     DECIMAL(15,2) NOT NULL DEFAULT 0,
  `remaining`          DECIMAL(15,2) NOT NULL DEFAULT 0,
  `savings_percentage` DECIMAL(6,2)  NOT NULL DEFAULT 0,
  `notes`              TEXT         NULL,
  `created_at`         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_plans_user` (`user_id`),
  CONSTRAINT `fk_plans_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================
--  Sample data (optional — remove if not needed)
-- =============================================
-- INSERT INTO `users` (firstname, lastname, email, password, currency)
-- VALUES ('Jean', 'Mutoni', 'jean@example.com', '$2y$12$...', 'RWF');
