import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic } from 'antd';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);

  useEffect(() => {
    api<Stats>('/dashboard/stats').then(setStats).catch(() => {});
    api<ChartData>('/dashboard/charts').then(setCharts).catch(() => {});
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">首页</div>
          <div className="page-subtitle">预约数据、就诊数据与收入的运营分析</div>
        </div>
      </div>

      <Row gutter={16} className="kpi-row">
        <Col span={6}><Card><Statistic title="本月预约量" value={stats?.appointments ?? 106} /></Card></Col>
        <Col span={6}><Card><Statistic title="就诊率" value={stats?.visitRate ?? '96.2%'} /></Card></Col>
        <Col span={6}><Card><Statistic title="爽约率" value={stats?.noshowRate ?? '3.8%'} /></Card></Col>
        <Col span={6}><Card><Statistic title="本月收入" value={stats?.revenue ?? '¥5,280'} /></Card></Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Card title="近7天预约量趋势" size="small">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={charts ? toSeries(charts.trend.labels, charts.trend.values) : []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#1890FF" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="近7天各科室预约量" size="small">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts ? toSeries(charts.deptBars.labels, charts.deptBars.values) : []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#1890FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="近7天挂号收入" size="small">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={charts ? toSeries(charts.income.labels, charts.income.values) : []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#52C41A" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title="关键指标" size="small" className="kpi-card">
        <Row gutter={16}>
          <Col span={6}><Statistic title="就诊率" value={stats?.visitRate ?? '96.2%'} /></Col>
          <Col span={6}><Statistic title="爽约率" value={stats?.noshowRate ?? '3.8%'} /></Col>
          <Col span={6}><Statistic title="本月收入" value={stats?.revenue ?? '¥5,280'} /></Col>
          <Col span={6}><Statistic title="本月预约量" value={stats?.appointments ?? 106} /></Col>
        </Row>
      </Card>
    </div>
  );
}