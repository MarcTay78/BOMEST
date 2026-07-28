-- Self-maintained pick-lists for product category and material category/item/type,
-- replacing the old fixed enums. Values stay denormalized text on products/materials
-- (no FK) so existing rows never go invalid; renaming a list entry cascades to every
-- row currently using the old text (see app-level renameOption).

create table product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table material_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table material_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table material_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table product_categories enable row level security;
alter table material_categories enable row level security;
alter table material_items enable row level security;
alter table material_types enable row level security;

create policy "product_categories read" on product_categories for select to authenticated using (true);
create policy "product_categories write" on product_categories for all to authenticated using (is_admin()) with check (is_admin());

create policy "material_categories read" on material_categories for select to authenticated using (true);
create policy "material_categories write" on material_categories for all to authenticated using (is_admin()) with check (is_admin());

create policy "material_items read" on material_items for select to authenticated using (true);
create policy "material_items write" on material_items for all to authenticated using (is_admin()) with check (is_admin());

create policy "material_types read" on material_types for select to authenticated using (true);
create policy "material_types write" on material_types for all to authenticated using (is_admin()) with check (is_admin());

-- Category is now a free-form pick from the lists above, not a fixed enum.
alter table products drop constraint if exists products_category_check;
alter table materials drop constraint if exists materials_category_check;

alter table materials add column item text not null default '';
alter table materials add column type text not null default '';
alter table materials add column size text not null default '';

-- Carry forward whatever category values already exist so nothing goes orphaned.
insert into product_categories (name)
  select distinct category from products where category is not null and category <> ''
  on conflict (name) do nothing;

insert into material_categories (name)
  select distinct category from materials where category is not null and category <> ''
  on conflict (name) do nothing;
