ALTER TABLE stories ADD COLUMN summary_compact TEXT;
ALTER TABLE stories ADD COLUMN summary_detailed TEXT;

UPDATE stories
SET summary_compact = summary,
    summary_detailed = summary
WHERE summary_compact IS NULL
   OR summary_detailed IS NULL;