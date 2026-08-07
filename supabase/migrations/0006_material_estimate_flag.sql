-- Materials can be flagged as "estimate only" (e.g. carton box) — display
-- badge only, the price still counts toward every cost total as normal.
-- See docs/superpowers/specs/2026-08-08-sqft-estimate-flag-design.md.

alter table materials add column is_estimate boolean not null default false;
