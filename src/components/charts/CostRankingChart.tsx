import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../../lib/costCalc';

export interface RankingRow {
  id: string;
  name: string;
  total: number;
  category: string;
}

const PALETTE = [
  'var(--color-accent-500)',
  'var(--color-accent-2-500)',
  'var(--color-neutral-600)',
  'var(--color-accent-700)',
  'var(--color-accent-2-700)',
  'var(--color-neutral-400)',
];

/** Stable color per category name, so the chart and its legend always agree. */
export function buildCategoryColorMap(categories: string[]): Record<string, string> {
  const unique = Array.from(new Set(categories)).sort();
  return Object.fromEntries(unique.map((cat, i) => [cat, PALETTE[i % PALETTE.length]]));
}

export function CostRankingChart({ rows }: { rows: RankingRow[] }) {
  const colorFor = buildCategoryColorMap(rows.map((r) => r.category));
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 40)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" horizontal={false} />
        <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 13 }} />
        <Tooltip formatter={(v) => formatCurrency(Number(v))} />
        <Bar dataKey="total" radius={[0, 6, 6, 0]}>
          {rows.map((row) => (
            <Cell key={row.id} fill={colorFor[row.category]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
