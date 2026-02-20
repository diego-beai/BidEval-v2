import { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { useLanguageStore } from '../../stores/useLanguageStore';

export interface PriceComparisonChartProps {
  data: Array<{
    projectName: string;
    totalPrice: number;
    currency: string;
    date: string;
    score?: number;
  }>;
  providerName: string;
}

export const PriceComparisonChart = ({ data, providerName }: PriceComparisonChartProps) => {
  const { t, language } = useLanguageStore();

  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((item) => ({
        name: item.projectName.length > 18
          ? item.projectName.substring(0, 16) + '...'
          : item.projectName,
        fullName: item.projectName,
        price: item.totalPrice,
        score: item.score != null ? (item.score > 10 ? item.score / 10 : item.score) : undefined,
        currency: item.currency,
        date: new Date(item.date).toLocaleDateString(
          language === 'es' ? 'es-ES' : 'en-US',
          { year: 'numeric', month: 'short' }
        ),
      }));
  }, [data, language]);

  const avgPrice = useMemo(() => {
    if (chartData.length === 0) return 0;
    return chartData.reduce((sum, d) => sum + d.price, 0) / chartData.length;
  }, [chartData]);

  const formatPrice = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  if (chartData.length < 2) {
    return (
      <div style={{
        padding: '24px 16px',
        textAlign: 'center',
        color: 'var(--text-tertiary)',
        fontSize: '0.8rem',
      }}>
        {t('supplier.history.chart_min_data')}
      </div>
    );
  }

  const hasScores = chartData.some((d) => d.score != null);

  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: hasScores ? 40 : 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={`priceGrad-${providerName}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent, #12b5b0)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--accent, #12b5b0)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border-color)"
            opacity={0.4}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border-color)' }}
            tickLine={false}
          />
          <YAxis
            yAxisId="price"
            tickFormatter={formatPrice}
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          {hasScores && (
            <YAxis
              yAxisId="score"
              orientation="right"
              domain={[0, 10]}
              tick={{ fill: '#f59e0b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
          )}
          <Tooltip
            contentStyle={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 10,
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              fontSize: '0.8rem',
              color: 'var(--text-primary)',
            }}
            labelStyle={{ fontWeight: 600, marginBottom: 4 }}
            formatter={(value: any, name: any) => {
              if (name === 'price') {
                return [Number(value).toLocaleString(), t('supplier.history.chart_price')];
              }
              if (name === 'score') {
                return [`${Number(value).toFixed(1)}/10`, 'Score'];
              }
              return [value, name];
            }}
            labelFormatter={(_label: any, payload: any) => {
              if (payload?.[0]?.payload) {
                const d = payload[0].payload;
                return `${d.fullName || _label} (${d.date || ''})`;
              }
              return _label;
            }}
          />
          <ReferenceLine
            yAxisId="price"
            y={avgPrice}
            stroke="var(--text-tertiary)"
            strokeDasharray="6 4"
            strokeOpacity={0.6}
            label={{
              value: t('supplier.history.chart_avg'),
              position: 'insideTopLeft',
              fill: 'var(--text-tertiary)',
              fontSize: 10,
            }}
          />
          <Area
            yAxisId="price"
            type="monotone"
            dataKey="price"
            stroke="var(--accent, #12b5b0)"
            strokeWidth={2}
            fill={`url(#priceGrad-${providerName})`}
            dot={{
              r: 4,
              fill: 'var(--accent, #12b5b0)',
              stroke: 'var(--bg-surface)',
              strokeWidth: 2,
            }}
            activeDot={{ r: 6, stroke: 'var(--accent, #12b5b0)', strokeWidth: 2 }}
          />
          {hasScores && (
            <Line
              yAxisId="score"
              type="monotone"
              dataKey="score"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={{ r: 3, fill: '#f59e0b', stroke: 'var(--bg-surface)', strokeWidth: 2 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
