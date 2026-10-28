-- Adds the Description column to a Use Case 3 database that was created before it existed.
-- Fresh databases already get it from usecase3_schema.sql, so run this ONLY on an existing one.
-- Running it twice gives "Duplicate column name 'Description'", which is harmless.
USE help_connect;

ALTER TABLE Support_session ADD COLUMN Description VARCHAR(255) NULL AFTER Title;
