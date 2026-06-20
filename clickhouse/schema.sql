CREATE DATABASE IF NOT EXISTS renting_berlin;

CREATE TABLE IF NOT EXISTS renting_berlin.view_events
(
    id String,
    entity_type LowCardinality(String),
    entity_id String,
    viewer_id String,
    viewed_at DateTime64(3, 'UTC')
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(viewed_at)
ORDER BY (entity_type, entity_id, viewed_at, id);

CREATE TABLE IF NOT EXISTS renting_berlin.email_sends
(
    id String,
    user_id Nullable(String),
    to_email String,
    category LowCardinality(String),
    subject String,
    links Array(String),
    created_at DateTime64(3, 'UTC')
)
ENGINE = MergeTree
ORDER BY (created_at, id);

CREATE TABLE IF NOT EXISTS renting_berlin.email_events
(
    id String,
    send_id String,
    event_type LowCardinality(String),
    link_index Nullable(UInt8),
    user_agent Nullable(String),
    ip_address Nullable(String),
    created_at DateTime64(3, 'UTC')
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(created_at)
ORDER BY (send_id, created_at, id);

CREATE TABLE IF NOT EXISTS renting_berlin.listing_events
(
    listing_id String,
    event_type LowCardinality(String),
    published_at DateTime64(3, 'UTC')
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(published_at)
ORDER BY (event_type, published_at, listing_id);

CREATE TABLE IF NOT EXISTS renting_berlin.site_visits
(
    visitor_id String,
    page LowCardinality(String),
    visited_at DateTime64(3, 'UTC')
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(visited_at)
ORDER BY (page, visitor_id, visited_at);
