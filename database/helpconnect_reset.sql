-- ============================================================================
-- DANGER: deletes EVERY table and all data in help_connect, then you re-run schema + seed.
-- Children are dropped before parents so foreign keys do not block it.
-- ============================================================================
USE help_connect;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS Notification, Feedback, Support_session, Support_request,
  Volunteer_Skill, Volunteer_Category, Volunteer, Skills, Category, User;
SET FOREIGN_KEY_CHECKS = 1;
