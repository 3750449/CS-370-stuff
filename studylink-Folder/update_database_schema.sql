-- update_database_schema.sql
-- Complete Database Migration Script
-- StudyLink All Database Changes

-- 1. User table: email as PK, passwordhash column size, remove old columns
-- 2. Note_Files: ownerID size increase, add classId column
-- 3. Bookmarks: create new table

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

CALL DropPrimaryKeyIfExists('Note_Files');

ALTER TABLE `Note_Files` 
  MODIFY COLUMN `ownerID` VARCHAR(100);

CALL AddColumnIfNotExists('Note_Files', 'fileID', 'VARCHAR(16) NOT NULL AFTER `ownerID`');
CALL AddColumnIfNotExists('Note_Files', 'classId', 'VARCHAR(32) NULL AFTER `LastUpdated`');

ALTER TABLE `Note_Files`
  MODIFY COLUMN `classId` VARCHAR(32)
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  NULL;

ALTER TABLE `Note_Files` ADD PRIMARY KEY (`fileID`);

CALL AddIndexIfNotExists('Note_Files', 'idx_notefiles_owner', '`ownerID`');

-- =========================================================================
-- STEP 2: Create bookmarks table
-- =========================================================================

CREATE TABLE IF NOT EXISTS `bookmarks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` VARCHAR(100) NOT NULL,
  `fileId` VARCHAR(16) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY `unique_bookmark` (`userId`, `fileId`),
  INDEX `idx_userId` (`userId`),
  INDEX `idx_fileId` (`fileId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `bookmarks` 
  MODIFY COLUMN `userId` VARCHAR(100) NOT NULL;

-- =========================================================================
-- STEP 3: Update User table
-- =========================================================================

CALL DropPrimaryKeyIfExists('User');

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

CALL DropColumnIfExists('User', 'UserNameID');
CALL DropColumnIfExists('User', 'nameID');
CALL DropColumnIfExists('User', 'password');
DROP PROCEDURE IF EXISTS DropColumnIfExists;

ALTER TABLE `User` 
  MODIFY COLUMN `email` VARCHAR(100) NOT NULL;

ALTER TABLE `User` 
  MODIFY COLUMN `passwordhash` VARCHAR(255);

ALTER TABLE `User` ADD PRIMARY KEY (`email`);

-- =========================================================================
-- STEP 4: Remove password reset tokens table (if exists)
-- =========================================================================

DROP TABLE IF EXISTS `password_reset_tokens`;

-- =========================================================================
-- STEP 5: Normalize table collations
-- =========================================================================

ALTER TABLE `classes`
  CONVERT TO CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Note_Files`
  CONVERT TO CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

ALTER TABLE `image_store`
  CONVERT TO CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- =========================================================================
-- Cleanup Utility Procedures
-- =========================================================================

DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DROP PROCEDURE IF EXISTS AddUniqueIndexIfNotExists;
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;
DROP PROCEDURE IF EXISTS DropPrimaryKeyIfExists;