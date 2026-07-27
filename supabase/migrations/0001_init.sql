-- BOMEST schema + RLS. See docs/05-data-model.md for the spec this implements.

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'viewer'))
);

create table materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('wood', 'hardware', 'finish', 'packaging')),
  unit text not null,
  current_price numeric not null check (current_price >= 0),
  updated_at timestamptz not null default now()
);

create table material_price_history (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references materials(id) on delete cascade,
  old_price numeric not null,
  changed_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('table', 'chair')),
  photo_url text,
  labor_cost numeric not null default 0 check (labor_cost >= 0),
  created_at timestamptz not null default now()
);

create table bom_lines (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  material_id uuid not null references materials(id) on delete restrict,
  quantity numeric not null check (quantity > 0)
);

-- Delete guard for materials: bom_lines.material_id has ON DELETE RESTRICT
-- above, so Postgres itself blocks the delete when a BOM line references it.
-- The app additionally pre-checks and shows "used in N product(s)" (see
-- src/data/supabaseStore.ts deleteMaterial) so the failure reads as a normal
-- product message instead of a raw FK-violation error.

alter table profiles enable row level security;
alter table materials enable row level security;
alter table material_price_history enable row level security;
alter table products enable row level security;
alter table bom_lines enable row level security;

create policy "self read" on profiles for select using (id = auth.uid());

create function is_admin() returns boolean
  language sql security definer stable as
  $$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

create policy "materials read" on materials for select to authenticated using (true);
create policy "materials write" on materials for all to authenticated using (is_admin()) with check (is_admin());

create policy "history read" on material_price_history for select to authenticated using (true);
create policy "history write" on material_price_history for insert to authenticated with check (is_admin());

create policy "products read" on products for select to authenticated using (true);
create policy "products write" on products for all to authenticated using (is_admin()) with check (is_admin());

create policy "bom_lines read" on bom_lines for select to authenticated using (true);
create policy "bom_lines write" on bom_lines for all to authenticated using (is_admin()) with check (is_admin());

insert into storage.buckets (id, name, public) values ('product-photos', 'product-photos', true);
create policy "photos read" on storage.objects for select using (bucket_id = 'product-photos');
create policy "photos write" on storage.objects for insert to authenticated with check (bucket_id = 'product-photos' and is_admin());
create policy "photos update" on storage.objects for update to authenticated using (bucket_id = 'product-photos' and is_admin());
