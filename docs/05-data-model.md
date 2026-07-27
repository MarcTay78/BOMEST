# Data Model (Supabase Postgres)

Single source of truth for schema, RLS, and cost formula. Module docs ([01-auth](01-auth.md), [02-materials](02-materials.md), [03-products](03-products.md), [04-dashboard](04-dashboard.md)) link here instead of repeating table definitions.

## Tables

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid | = `auth.users.id` |
| role | text | `'admin'` \| `'viewer'` |

### `materials`
| Column | Type | Notes |
|---|---|---|
| id | uuid/serial | pk |
| name | text | |
| category | text | `'wood'` \| `'hardware'` \| `'finish'` \| `'packaging'` |
| unit | text | free text, configurable per material, e.g. `'m3'`, `'kg'`, `'pcs'`, `'L'` |
| current_price | numeric | |
| updated_at | timestamp | |

### `material_price_history`
| Column | Type | Notes |
|---|---|---|
| id | uuid/serial | pk |
| material_id | fk → materials.id | |
| old_price | numeric | price before the edit that triggered this row |
| changed_at | timestamp | auto-inserted, via DB trigger or app logic on price update |

### `products`
| Column | Type | Notes |
|---|---|---|
| id | uuid/serial | pk |
| name | text | |
| category | text | `'table'` \| `'chair'` |
| photo_url | text, nullable | Supabase Storage path |
| labor_cost | numeric | fixed $, no hours×rate breakdown |
| created_at | timestamp | |

### `bom_lines`
| Column | Type | Notes |
|---|---|---|
| id | uuid/serial | pk |
| product_id | fk → products.id | |
| material_id | fk → materials.id | |
| quantity | numeric | in material's unit |

## RLS Policies

- All 5 tables: any authenticated user can `SELECT`.
- `materials`, `products`, `bom_lines`: only `role='admin'` (checked via `profiles` lookup) can `INSERT`/`UPDATE`/`DELETE`.
- `profiles`: self-read only. No in-app admin read-all / user management for v1 — roles seeded manually in Supabase dashboard.
- Enforcement is server-side (RLS) — client-side role checks in the app only hide UI, they are not the security boundary.

## Cost Calculation

Computed client-side, live, never persisted to DB:

```
product.total_cost = SUM(bom_lines.quantity × materials.current_price for that product) + product.labor_cost
```

Category breakdown = same sum grouped by `materials.category`, plus `labor_cost` as its own line, shown in Product Detail ([03-products.md](03-products.md)) and rolled up for ranking in Dashboard ([04-dashboard.md](04-dashboard.md)).

Shared implementation: `src/lib/costCalc.ts` — single helper used by Product Detail, Product List, and Dashboard so the formula never drifts between views.

## Cross-cutting error handling

| Case | Behavior | Owning module |
|---|---|---|
| Delete material referenced in BOM lines | Blocked, "used in N product(s)" | [02-materials.md](02-materials.md) |
| Product with empty BOM | Total = labor only, inline warning "no materials added yet" | [03-products.md](03-products.md) |
| Material price edit with no prior history | First edit creates first history row, using price-before-edit as old_price | [02-materials.md](02-materials.md) |
| Viewer role attempts write | Mutation UI hidden client-side; RLS blocks server-side regardless | [01-auth.md](01-auth.md) |
