CREATE TABLE page_views (
  event_id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  country TEXT NOT NULL
);
CREATE INDEX page_views_by_day ON page_views(day, country);

-- A visitor is one anonymous browser per UTC day. The first country wins that day.
CREATE TABLE visitors (
  day TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  country TEXT NOT NULL,
  PRIMARY KEY (day, visitor_hash)
) WITHOUT ROWID;
