# UI Page Guide

Screen-by-screen reference. Complements module docs ([01-auth](01-auth.md), [02-materials](02-materials.md), [03-products](03-products.md), [04-dashboard](04-dashboard.md), [05-data-model](05-data-model.md)) — those cover purpose/flow/Supabase wiring per module, this covers what's literally on each screen.

---

## 1. Login

**Route/entry point** — default screen for any unauthenticated visit; any protected route redirects here if no session.

**Layout**
- Email field
- Password field
- Submit button
- Inline error area (shown only on failure)

**Controls by role** — same screen for everyone, role not known yet at this point.

**States**
- Default (empty form)
- Submitting (button disabled/loading)
- Error — "invalid email or password", form stays filled except password
- Success — redirects immediately, no confirmation screen

**Navigation** — success → Product List. No signup/forgot-password link in v1 (accounts seeded manually in Supabase dashboard).

---

## 2. Product List

**Route/entry point** — landing page after login.

**Layout**
- Grid/table of products, each row/card: photo thumbnail, name, category, live total cost
- Sort control (by cost)
- "Add Product" button (admin only)

**Controls by role**
| Control | Admin | Viewer |
|---|---|---|
| View list, sort by cost | ✅ | ✅ |
| Add Product button | ✅ | ❌ hidden |

**States**
- Populated list (normal)
- Empty catalog (no products yet) — list shows empty state, "Add Product" still visible to admin
- Row cost reflects live calc — no loading spinner needed per row since Supabase read is direct

**Navigation** — click a row → Product Detail. Nav bar links to Materials Master, Dashboard, Logout.

---

## 3. Product Detail

**Route/entry point** — click-through from Product List, or redirect here right after "Add Product".

**Layout** (top to bottom)
1. Photo (uploaded image, or placeholder if none) + upload/replace control (admin)
2. BOM table (`BomTable.tsx`): rows of material / quantity / unit / line cost; add-row control at bottom (admin)
3. Labor cost field (admin editable, read-only display for viewer)
4. Cost breakdown (`CostBreakdown.tsx`): subtotal per category (wood/hardware/finish/packaging) + labor subtotal
5. Grand total, prominent

**Controls by role**
| Control | Admin | Viewer |
|---|---|---|
| View photo, BOM, breakdown, total | ✅ | ✅ |
| Upload/replace photo | ✅ | ❌ hidden |
| Add/edit/remove BOM line | ✅ | ❌ hidden |
| Edit labor cost | ✅ | ❌ hidden |

**States**
- Normal (BOM populated) — breakdown + total computed live
- Empty BOM — total = labor only, inline warning "no materials added yet"
- No photo uploaded — placeholder image shown

**Navigation** — back to Product List. No forward nav from here (leaf page).

---

## 4. Materials Master

**Route/entry point** — nav bar link, available to all roles.

**Layout**
- Table: name, category, unit, current price, last updated
- "Add Material" button (admin only)
- Per-row Edit / Delete controls (admin only)

**Controls by role**
| Control | Admin | Viewer |
|---|---|---|
| View list | ✅ | ✅ |
| Add Material | ✅ | ❌ hidden |
| Edit (price/name/etc) | ✅ | ❌ hidden |
| Delete | ✅ | ❌ hidden |

**States**
- Normal list
- Delete blocked — attempted delete on a material referenced in any product's BOM shows message "used in N product(s)", row not removed
- Price edit — on submit, old price silently logged to history (no extra confirmation dialog), row updates in place

**Navigation** — this page's material list feeds the material-picker dropdown used in Product Detail's BomTable and Dashboard's price trend chart, but no direct link — those pages query `materials` independently.

---

## 5. Dashboard

**Route/entry point** — nav bar link, available to all roles. Fully read-only page.

**Layout**
- Product Cost Ranking: bar chart/table, all products sorted by total cost descending
  - Category filter (table/chair) above or beside chart
- Material Price Trend: material dropdown selector + line chart (price over time, `material_price_history` + current price as latest point)

**Controls by role** — identical for admin and viewer (no mutation on this page).
| Control | Admin | Viewer |
|---|---|---|
| View ranking, filter by category | ✅ | ✅ |
| Pick material, view trend | ✅ | ✅ |

**States**
- Ranking populated (normal)
- No products yet — ranking chart/table empty
- Material selected with only current price, no history yet — trend chart shows single point
- No material selected yet — trend chart area empty/prompt "select a material"

**Navigation** — no forward nav (leaf page), nav bar links back to Product List / Materials Master.
