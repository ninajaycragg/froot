-- Burden: claims → elements → facts → evidence spans.
-- Postgres is the system of record; the vector index is a derived lens.
-- The index FINDS, the record CONFIRMS.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS claims (
  id        serial PRIMARY KEY,
  slug      text UNIQUE NOT NULL,
  title     text NOT NULL,
  body      text NOT NULL
);

CREATE TABLE IF NOT EXISTS elements (
  id          serial PRIMARY KEY,
  claim_id    int NOT NULL REFERENCES claims(id),
  idx         int NOT NULL,
  name        text NOT NULL,
  description text NOT NULL,
  UNIQUE (claim_id, idx)
);

-- Facts are the retrieval anchors: concrete enough to embed well,
-- specific enough that a span can support one and undermine another.
CREATE TABLE IF NOT EXISTS facts (
  id          serial PRIMARY KEY,
  element_id  int NOT NULL REFERENCES elements(id),
  text        text NOT NULL,
  embedding   vector(384)
);

CREATE TABLE IF NOT EXISTS documents (
  id          serial PRIMARY KEY,
  source_path text NOT NULL,
  title       text,
  sha256      text UNIQUE NOT NULL,   -- incremental ingest: same bytes never reprocessed
  ingested_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spans (
  id          serial PRIMARY KEY,
  document_id int NOT NULL REFERENCES documents(id),
  idx         int NOT NULL,
  text        text NOT NULL,
  embedding   vector(384),
  UNIQUE (document_id, idx)
);

CREATE TABLE IF NOT EXISTS evidence_links (
  id          serial PRIMARY KEY,
  span_id     int NOT NULL REFERENCES spans(id),
  fact_id     int NOT NULL REFERENCES facts(id),
  stance      text NOT NULL CHECK (stance IN ('supports','undermines')),
  confidence  real NOT NULL,
  origin      text NOT NULL CHECK (origin IN ('model','human')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (span_id, fact_id)
);

-- Corrections are data, not deletions. The link moves immediately;
-- the correction row becomes a labeled example that steers future classification.
CREATE TABLE IF NOT EXISTS corrections (
  id            serial PRIMARY KEY,
  link_id       int NOT NULL,  -- no FK: corrections are an append-only ledger that outlives the links they correct
  span_id       int NOT NULL REFERENCES spans(id),
  old_fact_id   int NOT NULL REFERENCES facts(id),
  new_fact_id   int REFERENCES facts(id),       -- null = link was simply wrong, removed
  old_stance    text NOT NULL,
  new_stance    text,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
