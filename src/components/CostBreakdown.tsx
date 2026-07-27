import type { ProductCost } from '../lib/costCalc';
import { computeCategoryBreakdown, formatCurrency } from '../lib/costCalc';

export function CostBreakdown({ cost }: { cost: ProductCost }) {
  const rows = computeCategoryBreakdown(cost);
  return (
    <div className="card" style={{ background: 'var(--color-surface)' }}>
      <div className="card-kicker">Cost breakdown</div>
      {rows.map((row) => (
        <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span className="text-muted">{row.label}</span>
          <span>{formatCurrency(row.value)}</span>
        </div>
      ))}
      <div className="hr" style={{ margin: '6px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--color-accent-700)' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, alignSelf: 'center', color: 'var(--color-text)' }}>Grand total</span>
        <span>{formatCurrency(cost.total)}</span>
      </div>
    </div>
  );
}
