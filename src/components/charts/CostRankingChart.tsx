import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../../lib/costCalc';

export interface RankingRow {
  id: string;
  name: string;
  total: number;
  category: 'table' | 'chair';
}

const CATEGORY_COLOR: Record<'table' | 'chair', string> = {
  table: 'var(--color-accent-500)',
  chair: 'var(--color-accent-2-500)',
};

export const CATEGORY_LEGEND: { label: string; color: string }[] = [
  { label: 'Table', color: CATEGORY_COLOR.table },
  { label: 'Chair', color: CATEGORY_COLOR.chair },
];

export function CostRankingChart({ rows }: { rows: RankingRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 40)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" horizontal={false} />
        <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 13 }} />
        <Tooltip formatter={(v) => formatCurrency(Number(v))} />
        <Bar dataKey="total" radius={[0, 6, 6, 0]}>
          {rows.map((row) => (
            <Cell key={row.id} fill={CATEGORY_COLOR[row.category]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
