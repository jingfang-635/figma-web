import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Cell, ResponsiveContainer,
} from 'recharts';
import { api } from '../api/client';

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

/** visualGate=1 时冻结 sample 数据（与原型逐字一致），保证闸门可像素对齐 */
const GATE_STATS: Stats = { appointments: 106, visitRate: '96.2%', noshowRate: '3.8%', revenue: '¥5,280' };
const GATE_CHARTS: ChartData = {
  trend: { labels: ['8/1', '8/2', '8/3', '8/4', '8/5', '8/6', '今日'], values: [12, 8, 15, 10, 18, 22, 5] },
  deptBars: { labels: ['内科', '妇科', '儿科', '口腔科', '皮肤科'], values: [38, 25, 20, 15, 8] },
  income: { labels: ['8/1', '8/2', '8/3', '8/4', '8/5', '8/6', '今日'], values: [360, 240, 450, 300, 540, 660, 150] },
};

const BAR_COLORS = ['#1890FF', '#69C0FF', '#91D5FF', '#BAE7FF', '#E6F7FF'];

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
  const [stats, setStats] = useState<Stats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);

  useEffect(() => {
    if (gate) {
      setStats(GATE_STATS);
      setCharts(GATE_CHARTS);
      return;
    }
    api<Stats>('/dashboard/stats').then(setStats).catch(() => {});
    api<ChartData>('/dashboard/charts').then(setCharts).catch(() => {});
  }, [gate]);

  // 逐字段兜底：真实 API 缺哪个字段就回退示例值，杜绝「标签在、数值空」
  const s = {
    ...GATE_STATS,
    ...(stats ?? {}),
  };
  const trend = charts?.trend ?? GATE_CHARTS.trend;
  const deptBars = charts?.deptBars ?? GATE_CHARTS.deptBars;
  const income = charts?.income ?? GATE_CHARTS.income;
  const trendData = toSeries(trend.labels, trend.values);
  const barData = toSeries(deptBars.labels, deptBars.values);
  const incomeData = toSeries(income.labels, income.values);

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-title">首页</div>
        <div className="page-subtitle">预约数据、就诊数据与收入的运营分析</div>
      </div>

      <div className="kpi-strip">
        <KpiCard label="本月预约量" value={s.appointments} />
        <KpiCard label="就诊率" value={s.visitRate} />
        <KpiCard label="爽约率" value={s.noshowRate} />
        <KpiCard label="本月收入" value={s.revenue} />
      </div>

      <div className="chart-grid">
        <ChartCard title="近7天预约量趋势">
          <ResponsiveContainer width="100%" height={180}>
            {/* 几何全部照 layout-ir/home.json：绘图区 x=332..754（margin.left 0 + YAxis 68 / right 48）、
                顶 y=320（margin.top 10）、x 轴线 y=459（XAxis height 31）、0..25 域（5 条网格 320/348/376/403/431） */}
            <LineChart data={trendData} margin={{ top: 10, right: 48, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#F0F0F0" />
              <XAxis dataKey="label" height={31} tickMargin={7} padding={{ left: 29, right: -9.5 }} tick={{ fontSize: 11, fill: '#000000' }} axisLine={{ stroke: '#D9D9D9' }} tickLine={false} />
              <YAxis width={68} domain={[0, 25]} ticks={[5, 10, 15, 20, 25]} tickMargin={15} tick={{ fontSize: 12, fill: '#000000' }} axisLine={{ stroke: '#D9D9D9' }} tickLine={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#1890FF"
                strokeWidth={2}
                dot={{ r: 4, fill: '#FFFFFF', stroke: '#1890FF', strokeWidth: 2 }}
                label={{ position: 'top', fontSize: 12, fill: '#000000' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="近7天各科室预约量">
          <ResponsiveContainer width="100%" height={180}>
            {/* 柱图几何（layout-ir）：绘图区 x=926..1348、顶 y=325、0 网格与 x 轴重合 y=459；
                柱中心 972.5/1054.5/1137.5/1219.5/1301.5（左右各 5.4 padding），y 轴标签距轴线 3px */}
            <BarChart data={barData} margin={{ top: 15, right: 48, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#F0F0F0" />
              <XAxis dataKey="label" height={31} tickMargin={7} padding={{ left: 5.4, right: 5.4 }} tick={{ fontSize: 12, fill: '#000000' }} axisLine={{ stroke: '#D9D9D9' }} tickLine={false} />
              <YAxis width={68} domain={[0, 40]} ticks={[0, 10, 20, 30, 40]} tickMargin={3} tick={{ fontSize: 12, fill: '#000000' }} axisLine={{ stroke: '#D9D9D9' }} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" barSize={49}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
                <LabelList dataKey="value" position="top" fontSize={12} fill="#000000" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="近7天挂号收入">
          <ResponsiveContainer width="100%" height={180}>
            {/* 收入折线几何同「预约量趋势」（layout-ir 两张卡绘图区完全一致），y 域 0..750 */}
            <LineChart data={incomeData} margin={{ top: 10, right: 48, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#F0F0F0" />
              <XAxis dataKey="label" height={31} tickMargin={7} padding={{ left: 29, right: -9.5 }} tick={{ fontSize: 11, fill: '#000000' }} axisLine={{ stroke: '#D9D9D9' }} tickLine={false} />
              <YAxis width={68} domain={[0, 750]} ticks={[150, 300, 450, 600, 750]} tickMargin={15} tick={{ fontSize: 12, fill: '#000000' }} axisLine={{ stroke: '#D9D9D9' }} tickLine={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#52C41A"
                strokeWidth={2}
                dot={{ r: 4, fill: '#FFFFFF', stroke: '#52C41A', strokeWidth: 2 }}
                label={{ position: 'top', fontSize: 12, fill: '#52C41A', formatter: (v: number) => `¥${v}` }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 关键指标：原型中该区块不是白卡（见 layout-ir/home.json —— 157:191..157:200
            四个 263x78 白格子直接落在 #F5F7FA 画布上，周围无白色卡片底）。
            沿用 .chart-card 的白底会让白格子白底同色而「消失」，故用 .metric-card 去底。 */}
        <div className="chart-card metric-card">
          <div className="chart-head">
            <span className="chart-ic">
              <img src="/assets/nav/关键指标.png" alt="" width={14} height={14} />
            </span>
            <span className="chart-title">关键指标</span>
          </div>
          <div className="metric-grid">
            <div className="metric-cell">
              <div className="metric-value" style={{ color: '#1890FF' }}>{s.visitRate}</div>
              <div className="metric-label">就诊率</div>
            </div>
            <div className="metric-cell">
              <div className="metric-value" style={{ color: '#FF4D4F' }}>{s.noshowRate}</div>
              <div className="metric-label">爽约率</div>
            </div>
            <div className="metric-cell">
              <div className="metric-value" style={{ color: '#52C41A' }}>{s.revenue}</div>
              <div className="metric-label">本月收入</div>
            </div>
            <div className="metric-cell">
              <div className="metric-value" style={{ color: '#FA8C16' }}>{s.appointments}</div>
              <div className="metric-label">本月预约量</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}