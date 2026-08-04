-- Composite materials: a material can be priced as the live sum of a
-- recipe of other (non-composite) materials, instead of a manual price.
-- See docs/superpowers/specs/2026-08-04-composite-materials-design.md.

alter table materials add column is_composite boolean not null default false;

create table material_components (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references materials(id) on delete cascade,
  component_material_id uuid not null references materials(id) on delete restrict,
  quantity numeric not null check (quantity > 0)
);

alter table material_components enable row level security;

create policy "material_components read" on material_components for select to authenticated using (true);
create policy "material_components write" on material_components for all to authenticated using (is_admin()) with check (is_admin());
