-- Re-adds the "estimate only" flag (previously added in 0006, dropped in
-- 0007 as unused). Materials without a real tracked cost (e.g. carton box)
-- get a visible badge; the price still counts toward totals as normal.

alter table materials add column is_estimate boolean not null default false;
