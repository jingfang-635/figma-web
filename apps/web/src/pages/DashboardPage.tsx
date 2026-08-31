import { Card, Spin } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchDashboardStats, fetchResourceList } from '../api/client';
import homeBlueprint from '../blueprints/home.json';
import { KpiRow, PageHeaderBlock } from '../components/chrome/PageBlocks';
import { isVisualGate } from '../visual/gate';

interface Point {
  label: string;
  value: number;
}

function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

/** Y ticks from 0 by `step` up to a ceiling that covers the series peak. */
function ticksToPeak(values: number[], step: number): number[] {
  const peak = Math.max(0, ...values);
  const top = Math.max(step, Math.ceil(peak / step) * step);
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return ticks;
}

export function DashboardPage() {
  const bp = homeBlueprint;
  const gate = isVisualGate();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchDashboardStats>> | null>(
    null,
  );
  const [appointments, setAppointments] = useState<Record<string, unknown>[]>([]);
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [s, a, o] = await Promise.all([
          fetchDashboardStats(),
          fetchResourceList('appointments'),
          fetchResourceList('orders'),
        ]);
        if (cancelled) return;
        setStats(s);
        setAppointments(a.data ?? []);
        setOrders(o.data ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const days = last7Days();

  const trend = useMemo<Point[]>(
    () =>
      days.map((day, i) => ({
        label: i === 6 ? '今日' : day.slice(5).replace('-', '/'),
        value: appointments.filter((a) => String(a.appointmentDate ?? '').startsWith(day)).length,
      })),
    [appointments, days],
  );

  const deptBars = useMemo<Point[]>(() => {
    const counts = new Map<string, number>();
    for (const a of appointments) {
      const doctor = a.doctor as Record<string, unknown> | undefined;
      const dept = doctor?.department as Record<string, unknown> | undefined;
      const name = String(dept?.name ?? '未分科');
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    const items = [...counts.entries()].map(([label, value]) => ({ label, value }));
    return items.length
      ? items
      : [
          { label: '内科', value: 0 },
          { label: '妇科', value: 0 },
          { label: '儿科', value: 0 },
        ];
  }, [appointments]);

  const income = useMemo<Point[]>(
    () =>
      days.map((day, i) => ({
        label: i === 6 ? '今日' : day.slice(5).replace('-', '/'),
        value: orders
          .filter((o) => String(o.createdAt ?? '').startsWith(day))
          .reduce((sum, o) => sum + Number(o.amount ?? 0), 0),
      })),
    [orders, days],
  );

  const monthCount = gate
    ? Number(bp.sample?.kpi?.monthAppointments ?? 0)
    : stats?.appointments ?? 0;
  const completed = appointments.filter((a) => a.status === 'completed').length;
  const cancelled = appointments.filter((a) => a.status === 'cancelled').length;
  const totalAppt = appointments.length || 1;
  const visitRate = gate
    ? Number(bp.sample?.kpi?.visitRate ?? 0)
    : Number(((completed / totalAppt) * 100).toFixed(1));
  const noShow = gate
    ? Number(bp.sample?.kpi?.noShowRate ?? 0)
    : Number(((cancelled / totalAppt) * 100).toFixed(1));
  const monthIncome = gate
    ? Number(bp.sample?.kpi?.monthIncome ?? 0)
    : orders.reduce((sum, o) => sum + Number(o.amount ?? 0), 0);

  const trendData = gate && bp.sample?.trend ? bp.sample.trend : trend;
  const deptBarData = gate && bp.sample?.deptBars ? bp.sample.deptBars : deptBars;
  const incomeData = gate && bp.sample?.income ? bp.sample.income : income;
  const incomeTicks = ticksToPeak(
    incomeData.map((p) => p.value),
    150,
  );
  const incomeTop = incomeTicks[incomeTicks.length - 1] ?? 150;

  const yuan = (n: number) => `¥${Number(n).toLocaleString('en-US')}`;
  const BAR_FILLS = ['#1890FF', '#69C0FF', '#91D5FF', '#BAE7FF', '#E6F7FF'];

  const kpiItems = [
    {
      key: 'monthAppointments',
      label: '本月预约量',
      value: monthCount,
    },
    {
      key: 'visitRate',
      label: '就诊率',
      value: `${visitRate}%`,
    },
    {
      key: 'noShowRate',
      label: '爽约率',
      value: `${noShow}%`,
    },
    {
      key: 'monthIncome',
      label: '本月收入',
      value: yuan(monthIncome),
    },
  ];

  if (loading && !stats) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const chartTitle = (id: string, fallback: string) =>
    bp.charts?.find((c) => c.id === id)?.title ?? fallback;

  return (
    <div>
      <PageHeaderBlock title={bp.pageHeader.title} subtitle={bp.pageHeader.subtitle} />
      <KpiRow items={kpiItems} />
      <div className="dash-chart-row">
        <Card bordered={false} className="dash-chart-card" title={<span className="chart-card-title">{chartTitle('trend', '📈 近7天预约量趋势')}</span>}>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData} margin={{ top: 16, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid stroke="#F0F0F0" vertical={false} syncWithTicks horizontalValues={[0, 5, 10, 15, 20, 25]} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8c8c8c' }} axisLine={false} tickLine={false} />
              <YAxis
                width={36}
                domain={[0, 25]}
                ticks={[0, 5, 10, 15, 20, 25]}
                interval={0}
                minTickGap={0}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#8c8c8c' }}
                axisLine={false}
                tickLine={false}
              />
              <Line type="linear" dataKey="value" stroke="#1890FF" strokeWidth={2} dot={{ r: 5, fill: '#1890FF', strokeWidth: 0 }} isAnimationActive={false}>
                <LabelList dataKey="value" position="top" fontSize={11} fill="#1890FF" offset={8} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card bordered={false} className="dash-chart-card" title={<span className="chart-card-title">{chartTitle('deptBars', '🥧 近7天各科室预约量')}</span>}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={deptBarData} margin={{ top: 16, right: 28, left: 4, bottom: 0 }} barSize={49} barCategoryGap={33}>
              <CartesianGrid stroke="#F0F0F0" vertical={false} syncWithTicks horizontalValues={[0, 10, 20, 30, 40]} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8c8c8c' }} axisLine={false} tickLine={false} />
              <YAxis
                width={36}
                domain={[0, 40]}
                ticks={[0, 10, 20, 30, 40]}
                interval={0}
                minTickGap={0}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#8c8c8c' }}
                axisLine={false}
                tickLine={false}
              />
              <Bar dataKey="value" radius={[2, 2, 0, 0]} isAnimationActive={false} maxBarSize={49}>
                {deptBarData.map((_, i) => (
                  <Cell key={i} fill={BAR_FILLS[i] || '#1890FF'} />
                ))}
                <LabelList dataKey="value" position="top" fontSize={11} fill="#595959" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card bordered={false} className="dash-chart-card" title={<span className="chart-card-title">{chartTitle('income', '💰 近7天挂号收入')}</span>}>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={incomeData} margin={{ top: 16, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="#F0F0F0" vertical={false} syncWithTicks horizontalValues={incomeTicks} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8c8c8c' }} axisLine={false} tickLine={false} />
              <YAxis
                width={incomeTop >= 1000 ? 48 : 40}
                domain={[0, incomeTop]}
                ticks={incomeTicks}
                interval={0}
                minTickGap={0}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#8c8c8c' }}
                axisLine={false}
                tickLine={false}
              />
              <Line type="linear" dataKey="value" stroke="#52C41A" strokeWidth={2} dot={{ r: 5, fill: '#52C41A', strokeWidth: 0 }} isAnimationActive={false}>
                <LabelList dataKey="value" position="top" fontSize={11} fill="#52C41A" formatter={(v) => yuan(Number(v))} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card bordered={false} className="dash-chart-card" title={<span className="chart-card-title">{chartTitle('metrics', '📊 关键指标')}</span>}>
          <div className="metric-grid">
            <div className="metric-tile">
              <div className="metric-value" style={{ color: '#1890FF' }}>
                {visitRate}%
              </div>
              <div className="metric-label">就诊率</div>
            </div>
            <div className="metric-tile">
              <div className="metric-value" style={{ color: '#FF4D4F' }}>
                {noShow}%
              </div>
              <div className="metric-label">爽约率</div>
            </div>
            <div className="metric-tile">
              <div className="metric-value" style={{ color: '#52C41A' }}>
                {yuan(monthIncome)}
              </div>
              <div className="metric-label">本月收入</div>
            </div>
            <div className="metric-tile">
              <div className="metric-value" style={{ color: '#FA8C16' }}>
                {monthCount}
              </div>
              <div className="metric-label">本月预约量</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
