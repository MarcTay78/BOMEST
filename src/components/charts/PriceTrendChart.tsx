import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../../lib/costCalc';

export interface TrendPoint {
  label: string;
  price: number;
}

export function PriceTrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) {
    return <p className="text-muted" style={{ padding: '40px 0', textAlign: 'center' }}>Select a material</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={176}>
      <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10.5 }} />
        <YAxis hide domain={['dataMin - 30', 'dataMax + 30']} />
        <Tooltip formatter={(v) => formatCurrency(Number(v))} />
        <Line type="monotone" dataKey="price" stroke="var(--color-accent-2-700)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--color-accent-2-700)' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
