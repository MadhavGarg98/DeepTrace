import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { formatCurrency } from '../../utils/format';

interface RevenueChartProps {
  totalRevenue: number;
  revenueAtRisk: number;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ totalRevenue, revenueAtRisk }) => {
  const data = [
    { name: 'Total Revenue', value: totalRevenue, fill: 'var(--color-border-strong)' },
    { name: 'At Risk', value: revenueAtRisk, fill: 'var(--color-risk)' },
  ];

  return (
    <div className="h-[120px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 80, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" width={90} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
          <Tooltip 
            cursor={{fill: 'transparent'}}
            contentStyle={{ borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '12px' }}
            formatter={(value: any) => [formatCurrency(value), 'Revenue']}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
            <LabelList dataKey="value" position="right" formatter={(val: any) => formatCurrency(val)} style={{ fontSize: '11px', fill: 'var(--color-text-primary)' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
