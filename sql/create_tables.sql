-- CREATE TABLE metrics (
--   metric TEXT PRIMARY KEY,
--   format TEXT NOT NULL,
--   prompt TEXT
-- );

CREATE TABLE raw_data (
    id SERIAL,
    time TIMESTAMPTZ(0) NOT NULL,
    time_imported TIMESTAMPTZ(0) NOT NULL,
    metric TEXT NOT NULL,
    format TEXT NOT NULL,
    prompt TEXT,
    value TEXT NOT NULL,
    source TEXT NOT NULL,
    is_backfilled BOOLEAN NOT NULL DEFAULT FALSE,

    CHECK (time_imported >= time),
    UNIQUE (time, prompt)
);

-- CREATE_TABLE last_run (
--   command TEXT PRIMARY KEY,
--   last_run TIMESTAMPTZ(0) NOT NULL,
--   last_message TIMESTAMPTZ(0) NOT NULL
-- );

SET TIME ZONE 'UTC';

SELECT create_hypertable('raw_data', 'time');
CREATE INDEX ON raw_data (metric, time DESC);
CREATE INDEX ON raw_data (is_backfilled, time DESC);

