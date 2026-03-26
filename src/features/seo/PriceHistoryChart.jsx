// src/features/seo/PriceHistoryChart.jsx
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'

const RUPEE = '\u20B9'

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="glass-deep rounded-xl p-3 border border-[var(--fog-border)] shadow-xl relative z-50">
        <p className="type-meta text-[var(--text-muted)] mb-1">
          {new Date(label).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
        </p>
        <p className="type-data-value text-[var(--text-primary)]">
          {RUPEE}{payload[0].value}
        </p>
      </div>
    )
  }
  return null
}

export default function PriceHistoryChart({ data, title = 'Price History' }) {
  // data should be sorted by date ascending: [{ date: '2026-01-01', price: 810 }]

  if (!data || data.length < 2) {
    return (
      <Card variant="inset" className="h-full flex flex-col min-h-[260px]">
        <CardHeader title={title} titleAs="h3" />
        <CardBody className="flex-grow flex items-center justify-center">
          <p className="type-meta text-[var(--text-muted)]">Not enough historical data.</p>
        </CardBody>
      </Card>
    )
  }

  const minPrice = Math.min(...data.map(d => d.price)) - 20
  const maxPrice = Math.max(...data.map(d => d.price)) + 20

  return (
    <Card variant="inset" className="h-full flex flex-col min-h-[260px]">
      <CardHeader title={title} titleAs="h3" />
      <CardBody className="flex-grow pt-4">
        <div className="h-[180px] w-full mt-2 relative z-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-glow)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--accent-glow)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={(val) => new Date(val).toLocaleDateString('en-IN', { month: 'short' })}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-body)' }}
                dy={10}
                minTickGap={30}
              />
              <YAxis
                domain={[minPrice, maxPrice]}
                hide
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: 'var(--divider)', strokeWidth: 1, strokeDasharray: '4 4' }}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="var(--accent-glow)"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorPrice)"
                animationDuration={1500}
                activeDot={{ r: 6, fill: 'var(--bg-raised)', stroke: 'var(--accent-glow)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}
