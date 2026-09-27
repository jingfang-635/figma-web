import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Cell, ResponsiveContainer,
} from 'recharts';
import { api } from '../api/client';
import { chart, color as token } from '../generated/tokens';
import { getScreenByRoute } from '../generated/screenConfigs';

interface Stats {
  appointments: number;
  visitRate: string;
  noshowRate: string;
  revenue: string;
}

interface ChartData {
  trend: { labels: string[]; values: number[] };
  deptBars: { labels: string[]; values: number[] };
  income: { labels: string[]; values: number[] };
}

function toSeries(labels: string[], values: number[]) {
  return labels.map((label, i) => ({ label, value: values[i] }));
}

/** 柱色板由 Layout IR 派生（具名 bar-* 节点），不在此写死 */
const BAR_COLORS = chart.series;

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="chart-card">
      <div className="chart-head">
        <span className="chart-ic">
          <img src={`/assets/nav/${encodeURIComponent(title)}.png`} alt="" width={14} height={14} />
        </span>
        <span className="chart-title">{title}</span>
      </div>
      <div className="chart-plot">{children}</div>
    </div>
  );
}

export default function HomePage() {
  const gate = new URLSearchParams(window.location.search).get('visualGate') === '1';
  const config = getScreenByRoute(window.location.pathname);
  /** gate 冻结样本来自 spec（app-spec.json → screens[].sample → 生成物），页面不自带副本 */
  const sample = (config?.sample ?? {}) as { stats?: Stats; charts?: ChartData };
  const [stats, setStats] = useState<Stats | null>(sample.stats ?? null);
  const [charts, setCharts] = useState<ChartData | null>(sample.charts ?? null);

  useEffect(() => {
    if (gate) return;
    api<Stats>('/dashboard/stats').then(setStats).catch(() => {});
    api<ChartData>('/dashboard/charts').then(setCharts).catch(() => {});
  }, [gate]);

  // 非 gate 一律用真实接口数据，缺字段不回退示例值——
  // 否则「接口挂了/字段没了」会被示例值掩盖成「看起来正常」
  const s: Stats | null = stats;
  const trend = charts?.trend;
  const deptBars = charts?.deptBars;
  const income = charts?.income;
  const trendData = trend ? toSeries(trend.labels, trend.values) : [];
  const barData = deptBars ? toSeries(deptBars.labels, deptBars.values) : [];
  const incomeData = income ? toSeries(income.labels, income.values) : [];

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-title">{config?.title}</div>
        <div className="page-subtitle">预约数据、就诊数据与收入的运营分析</div>
      </div>

      <div className="kpi-strip">
        <KpiCard label="本月预约量" value={s ? s.appointments : '—'} />
        <KpiCard label="就诊率" value={s ? s.visitRate : '—'} />
        <KpiCard label="爽约率" value={s ? s.noshowRate : '—'} />
        <KpiCard label="本月收入" value={s ? s.revenue : '—'} />
      </div>

      <div className="chart-grid">
        <ChartCard title="近7天预约量趋势">
          <ResponsiveContainer width="100%" height={180}>
            {/* 绘图区 / margin / axis / tick / 域 逐项照 layout-ir/home.json（此处不复述数值，IR 变更不会让注释漂移） */}
            <LineChart data={trendData} margin={{ top: 10, right: 48, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={chart.grid ?? undefined} />
              <XAxis dataKey="label" height={31} tickMargin={7} padding={{ left: 29, right: -9.5 }} tick={{ fontSize: 11, fill: chart.label ?? undefined }} axisLine={{ stroke: chart.axis ?? undefined }} tickLine={false} />
              <YAxis width={68} domain={[0, 25]} ticks={[5, 10, 15, 20, 25]} tickMargin={15} tick={{ fontSize: 12, fill: chart.label ?? undefined }} axisLine={{ stroke: chart.axis ?? undefined }} tickLine={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke={token.primary}
                strokeWidth={2}
                dot={{ r: 4, fill: token.surface, stroke: token.primary, strokeWidth: 2 }}
                label={{ position: 'top', fontSize: 12, fill: chart.label ?? undefined }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="近7天各科室预约量">
          <ResponsiveContainer width="100%" height={180}>
            {/* 柱图几何照 layout-ir/home.json（绘图区 / 柱心 / tick 间距逐项对 IR） */}
            <BarChart data={barData} margin={{ top: 15, right: 48, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={chart.grid ?? undefined} />
              <XAxis dataKey="label" height={31} tickMargin={7} padding={{ left: 5.4, right: 5.4 }} tick={{ fontSize: 12, fill: chart.label ?? undefined }} axisLine={{ stroke: chart.axis ?? undefined }} tickLine={false} />
              <YAxis width={68} domain={[0, 40]} ticks={[0, 10, 20, 30, 40]} tickMargin={3} tick={{ fontSize: 12, fill: chart.label ?? undefined }} axisLine={{ stroke: chart.axis ?? undefined }} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" barSize={49}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
                <LabelList dataKey="value" position="top" fontSize={12} fill={chart.label ?? undefined} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="近7天挂号收入">
          <ResponsiveContainer width="100%" height={180}>
            {/* 收入折线几何照 layout-ir/home.json（绘图区与趋势卡一致；y 域取 IR 的 tick） */}
            <LineChart data={incomeData} margin={{ top: 10, right: 48, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={chart.grid ?? undefined} />
              <XAxis dataKey="label" height={31} tickMargin={7} padding={{ left: 29, right: -9.5 }} tick={{ fontSize: 11, fill: chart.label ?? undefined }} axisLine={{ stroke: chart.axis ?? undefined }} tickLine={false} />
              <YAxis width={68} domain={[0, 750]} ticks={[150, 300, 450, 600, 750]} tickMargin={15} tick={{ fontSize: 12, fill: chart.label ?? undefined }} axisLine={{ stroke: chart.axis ?? undefined }} tickLine={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke={token.success}
                strokeWidth={2}
                dot={{ r: 4, fill: token.surface, stroke: token.success, strokeWidth: 2 }}
                label={{ position: 'top', fontSize: 12, fill: token.success, formatter: (v: number) => `¥${v}` }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 关键指标：IR 里该区块**没有带 fill 的父容器**（见 layout-ir/home.json）→ 必须透明，
            不得加卡片底。「IR 没有容器节点」是设计信息，不是缺失信息。改用 .metric-card 去底。 */}
        <div className="chart-card metric-card">
          <div className="chart-head">
            <span className="chart-ic">
              <img src="/assets/nav/关键指标.png" alt="" width={14} height={14} />
            </span>
            <span className="chart-title">关键指标</span>
          </div>
          <div className="metric-grid">
            <div className="metric-cell">
              <div className="metric-value" style={{ color: token.primary }}>{s ? s.visitRate : '—'}</div>
              <div className="metric-label">就诊率</div>
            </div>
            <div className="metric-cell">
              <div className="metric-value" style={{ color: token.danger }}>{s ? s.noshowRate : '—'}</div>
              <div className="metric-label">爽约率</div>
            </div>
            <div className="metric-cell">
              <div className="metric-value" style={{ color: token.success }}>{s ? s.revenue : '—'}</div>
              <div className="metric-label">本月收入</div>
            </div>
            <div className="metric-cell">
              <div className="metric-value" style={{ color: token.warning }}>{s ? s.appointments : '—'}</div>
              <div className="metric-label">本月预约量</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}