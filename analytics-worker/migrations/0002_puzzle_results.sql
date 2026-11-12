CREATE TABLE puzzle_plays (
  play_hash TEXT PRIMARY KEY,
  started_day TEXT NOT NULL,
  game_day TEXT NOT NULL,
  puzzle_id TEXT NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts BETWEEN 1 AND 3),
  status TEXT NOT NULL CHECK (
    (status = 'playing' AND attempts IN (1, 2)) OR
    (status = 'solved' AND attempts BETWEEN 1 AND 3) OR
    (status = 'failed' AND attempts = 3)
  )
);
CREATE INDEX puzzle_plays_by_day ON puzzle_plays(started_day);
