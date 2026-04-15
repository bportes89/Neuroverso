-- No-op migration kept for compatibility.
-- The Signature table is created in a later migration and its default
-- is adjusted there, so this migration must not alter a table that does
-- not exist yet on a fresh database.
SELECT 1;
