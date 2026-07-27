-- Product obsolete-status flag (product page: rename/delete/mark obsolete).
alter table products add column obsolete boolean not null default false;
