import { OptionListManager } from '../components/OptionListManager';

export function Lists() {
  return (
    <div className="content">
      <h1 style={{ margin: '0 0 4px' }}>Lists</h1>
      <p className="text-muted" style={{ margin: '0 0 22px', fontSize: 13 }}>
        Maintain the pick-lists used across Products and Materials. Renaming an entry updates every row that used the
        old name; deleting one that's still in use is blocked.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
        <OptionListManager kind="product_categories" label="Product categories" />
        <OptionListManager kind="material_categories" label="Material categories" />
        <OptionListManager kind="material_items" label="Material items" />
        <OptionListManager kind="material_types" label="Material types" />
      </div>
    </div>
  );
}
