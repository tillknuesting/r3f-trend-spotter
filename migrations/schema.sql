CREATE TABLE IF NOT EXISTS trends (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    source TEXT NOT NULL,
    score REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    summary TEXT,
    metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_trends_timestamp ON trends(timestamp);
CREATE INDEX IF NOT EXISTS idx_trends_score ON trends(score);
