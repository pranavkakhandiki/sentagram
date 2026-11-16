-- Old traffic has only a UTC date, not a timestamp. Preserve it without
-- mislabeling it as PST. New traffic is explicitly marked by the Worker.
ALTER TABLE page_views ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE visitors ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';
CREATE INDEX page_views_timezone_day ON page_views(timezone, day);
CREATE INDEX visitors_timezone_day ON visitors(timezone, day);
-- Puzzle results are grouped by the puzzle date, never first-recorded UTC day.
CREATE INDEX puzzle_plays_game_day ON puzzle_plays(game_day);
