-- ============================================================================
-- Complete Database Migration Script
-- StudyLink Phase 3 - All Database Changes
-- ============================================================================
-- This script applies all database schema changes made during Phase 3:
-- 1. User table: email as PK, passwordhash column size, remove old columns
-- 2. Note_Files: ownerID size increase, add classId column
-- 3. Bookmarks: create new table
-- ============================================================================

-- =========================================================================
-- Utility Procedures
-- =========================================================================
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS AddColumnIfNotExists(
    IN tableName VARCHAR(64),
    IN columnName VARCHAR(64),
    IN columnDefinition TEXT
)
BEGIN
    DECLARE columnExists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO columnExists
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND COLUMN_NAME = columnName;
    
    IF columnExists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` ADD COLUMN `', columnName, '` ', columnDefinition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

CREATE PROCEDURE IF NOT EXISTS AddUniqueIndexIfNotExists(
    IN tableName VARCHAR(64),
    IN indexName VARCHAR(64),
    IN columnList TEXT
)
BEGIN
    DECLARE indexExists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO indexExists
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND INDEX_NAME = indexName;
    
    IF indexExists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` ADD UNIQUE KEY `', indexName, '` (', columnList, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

CREATE PROCEDURE IF NOT EXISTS AddIndexIfNotExists(
    IN tableName VARCHAR(64),
    IN indexName VARCHAR(64),
    IN columnList TEXT
)
BEGIN
    DECLARE indexExists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO indexExists
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND INDEX_NAME = indexName;
    
    IF indexExists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` ADD INDEX `', indexName, '` (', columnList, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

CREATE PROCEDURE IF NOT EXISTS DropPrimaryKeyIfExists(
    IN tableName VARCHAR(64)
)
BEGIN
    DECLARE pkExists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO pkExists
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND CONSTRAINT_TYPE = 'PRIMARY KEY';
    
    IF pkExists > 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` DROP PRIMARY KEY');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

-- =========================================================================
-- STEP 1: Update Note_Files table
-- =========================================================================
-- Increase ownerID column size to support email addresses (VARCHAR(100))
-- Add fileID column for linking to image_store and classId for filtering

-- Drop legacy primary key on ownerID (if it exists)
CALL DropPrimaryKeyIfExists('Note_Files');

-- Check and modify ownerID column if needed
ALTER TABLE `Note_Files` 
  MODIFY COLUMN `ownerID` VARCHAR(100);

-- Ensure fileID column exists (stores image_store.id as VARCHAR)
CALL AddColumnIfNotExists('Note_Files', 'fileID', 'VARCHAR(16) NOT NULL AFTER `ownerID`');

-- Ensure classId column exists for class filtering
CALL AddColumnIfNotExists('Note_Files', 'classId', 'VARCHAR(32) NULL AFTER `LastUpdated`');

-- Normalize classId column collation
ALTER TABLE `Note_Files`
  MODIFY COLUMN `classId` VARCHAR(32)
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  NULL;

-- Set fileID as the new primary key
ALTER TABLE `Note_Files` ADD PRIMARY KEY (`fileID`);

-- Helpful index for owner lookups
CALL AddIndexIfNotExists('Note_Files', 'idx_notefiles_owner', '`ownerID`');

-- ============================================================================
-- STEP 2: Create bookmarks table
-- ============================================================================
-- Table to store user bookmarks for files
-- userId references User.email (VARCHAR(100))
-- fileId references image_store.id (stored as VARCHAR(16))

CREATE TABLE IF NOT EXISTS `bookmarks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` VARCHAR(100) NOT NULL,
  `fileId` VARCHAR(16) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY `unique_bookmark` (`userId`, `fileId`),
  INDEX `idx_userId` (`userId`),
  INDEX `idx_fileId` (`fileId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update userId column if table already exists with old structure
-- This handles the case where bookmarks table was created manually with VARCHAR(16)
ALTER TABLE `bookmarks` 
  MODIFY COLUMN `userId` VARCHAR(100) NOT NULL;

-- ============================================================================
-- STEP 3: Update User table
-- ============================================================================
-- Migrate User table to use email as primary key
-- Remove: UserNameID, nameID, password columns
-- Keep: email (PK, VARCHAR(100)), passwordhash (VARCHAR(255))

-- Step 3.1: Drop old primary key if it exists on UserNameID
CALL DropPrimaryKeyIfExists('User');

-- Step 3.2: Safely drop old columns using a procedure
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS DropColumnIfExists(
    IN tableName VARCHAR(64),
    IN columnName VARCHAR(64)
)
BEGIN
    DECLARE columnExists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO columnExists
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND COLUMN_NAME = columnName;
    
    IF columnExists > 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` DROP COLUMN `', columnName, '`');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

-- Use the procedure to drop columns safely
CALL DropColumnIfExists('User', 'UserNameID');
CALL DropColumnIfExists('User', 'nameID');
CALL DropColumnIfExists('User', 'password');

-- Clean up the procedure
DROP PROCEDURE IF EXISTS DropColumnIfExists;

-- Step 3.3: Ensure email column is VARCHAR(100) and set as primary key
-- First, modify email column if needed
ALTER TABLE `User` 
  MODIFY COLUMN `email` VARCHAR(100) NOT NULL;

-- Ensure passwordhash column is VARCHAR(255) for bcrypt hashes
ALTER TABLE `User` 
  MODIFY COLUMN `passwordhash` VARCHAR(255);

-- Set email as primary key
ALTER TABLE `User` ADD PRIMARY KEY (`email`);

-- ============================================================================
-- STEP 4: Remove password reset tokens table (if exists)
-- ============================================================================
-- Password reset via email tokens has been removed.
-- Users can now change their password while logged in using the password change endpoint.
-- If the table exists, drop it.

DROP TABLE IF EXISTS `password_reset_tokens`;

-- ============================================================================
-- STEP 5: Normalize classes table collation
-- =========================================================================
-- Ensure classes table uses utf8mb4_unicode_ci so joins with Note_Files.classId work
ALTER TABLE `classes`
  CONVERT TO CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the migration was successful:

-- Verify User table structure:
-- DESCRIBE `User`;
-- Expected: email (PK, VARCHAR(100)), passwordhash (VARCHAR(255))

-- Verify Note_Files table structure:
-- DESCRIBE `Note_Files`;
-- Expected: ownerID (VARCHAR(100)), classId (VARCHAR(32), nullable)

-- Verify bookmarks table structure:
-- DESCRIBE `bookmarks`;
-- Expected: id (PK), userId (VARCHAR(100)), fileId (VARCHAR(16)), createdAt (DATETIME(3))

-- ============================================================================
-- SUMMARY OF CHANGES
-- ============================================================================
-- User Table:
--   - email: VARCHAR(100) PRIMARY KEY (was VARCHAR(100), now PK)
--   - passwordhash: VARCHAR(255) (increased from smaller size for bcrypt)
--   - Removed: UserNameID, nameID, password columns
--
-- Note_Files Table:
--   - ownerID: VARCHAR(100) (increased from VARCHAR(16) to support email)
--   - classId: VARCHAR(32) NULL (NEW - for class filtering)
--   - Other columns unchanged: fileID, fileType, size, LastUpdated
--
-- Bookmarks Table (NEW):
--   - id: INT AUTO_INCREMENT PRIMARY KEY
--   - userId: VARCHAR(100) NOT NULL (references User.email)
--   - fileId: VARCHAR(16) NOT NULL (references image_store.id)
--   - createdAt: DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
--   - UNIQUE constraint on (userId, fileId)
--   - Indexes on userId and fileId
--
-- Password Reset Tokens Table (REMOVED):
--   - Password reset via email tokens has been removed
--   - Users can change password while logged in using PUT /api/auth/password
-- ============================================================================

-- =========================================================================
-- Cleanup Utility Procedures
-- =========================================================================
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DROP PROCEDURE IF EXISTS AddUniqueIndexIfNotExists;
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;
DROP PROCEDURE IF EXISTS DropPrimaryKeyIfExists;

