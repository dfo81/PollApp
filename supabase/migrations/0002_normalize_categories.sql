-- The seed rows of 0001 used ad-hoc category names that are not in SURVEY_CATEGORIES
-- (src/app/core/survey.models.ts), so those surveys vanished as soon as a category
-- filter was set. This maps them onto the canonical names.
-- Run this in the Supabase SQL editor.

update surveys set category = 'Team Activities'         where category = 'Teamactivities';
update surveys set category = 'Health & Wellness'       where category = 'Health';
update surveys set category = 'Technology & Innovation' where category = 'Tools';

-- Leftovers, should return no rows:
--   select distinct category from surveys
--   where category not in ('Team Activities', 'Health & Wellness', 'Gaming & Entertainment',
--                          'Education & Learning', 'Lifestyle & Preferences',
--                          'Technology & Innovation');
