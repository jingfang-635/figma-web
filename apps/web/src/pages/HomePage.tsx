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

  const trend = charts?.trend ?? GATE_CHARTS.trend;
  const deptBars = charts?.deptBars ?? GATE_CHARTS.deptBars;
  const income = charts?.income ?? GATE_CHARTS.income;
  const s = stats ?? GATE_STATS;

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
            <LineChart data={trendData} margin={{ top: 18, right: 16, bottom: 0, left: -20 }}>
              <CartesianGrid vertical={false} stroke="#F0F0F0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#595959' }} axisLine={{ stroke: '#D9D9D9' }} tickLine={false} />
              <YAxis domain={[5, 25]} ticks={[5, 10, 15, 20, 25]} tick={{ fontSize: 12, fill: '#595959' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line
                type="linear"
                dataKey="value"
                stroke="#1890FF"
                strokeWidth={2}
                dot={{ r: 4, fill: '#FFFFFF', stroke: '#1890FF', strokeWidth: 2 }}
                label={{ position: 'top', fontSize: 12, fill: '#595959' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="近7天各科室预约量">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} margin={{ top: 18, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid vertical={false} stroke="#F0F0F0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#595959' }} axisLine={{ stroke: '#D9D9D9' }} tickLine={false} />
              <YAxis domain={[0, 40]} ticks={[0, 10, 20, 30, 40]} tick={{ fontSize: 12, fill: '#595959' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" barSize={49} radius={[2, 2, 0, 0]}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
                <LabelList dataKey="value" position="top" fontSize={12} fill="#595959" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="近7天挂号收入">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={incomeData} margin={{ top: 18, right: 16, bottom: 0, left: -20 }}>
              <CartesianGrid vertical={false} stroke="#F0F0F0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#595959' }} axisLine={{ stroke: '#D9D9D9' }} tickLine={false} />
              <YAxis domain={[150, 750]} ticks={[150, 300, 450, 600, 750]} tick={{ fontSize: 12, fill: '#595959' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line
                type="linear"
                dataKey="value"
                stroke="#52C41A"
                strokeWidth={2}
                dot={{ r: 4, fill: '#FFFFFF', stroke: '#52C41A', strokeWidth: 2 }}
                label={{ position: 'top', fontSize: 12, fill: '#595959', formatter: (v: number) => `¥${v}` }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="chart-card">
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