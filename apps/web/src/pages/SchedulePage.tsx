import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Select, Space, Tag, Tooltip } from 'antd';
import { LeftOutlined, RightOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { api } from '../api/client';

interface Schedule {
  id: number;
  doctorId: number;
  doctorName: string;
  deptName: string;
  date: string;
  slot: string;
  quota: number;
  booked: number;
  status: string;
}

const WEEK_HEADERS = ['日', '一', '二', '三', '四', '五', '六'];

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));

  useEffect(() => {
    const start = `${month}-01`;
    const end = dayjs(start).endOf('month').format('YYYY-MM-DD');
    api<Schedule[]>(`/schedules`).then((list) =>
      setSchedules(list.filter((s) => s.date >= start && s.date <= end)),
    ).catch(() => {});
  }, [month]);

  const cells = useMemo(() => {
    const first = dayjs(`${month}-01`);
    const startDay = first.day();
    const daysInMonth = first.daysInMonth();
    const list: { date: string | null; day: number | null }[] = [];
    for (let i = 0; i < startDay; i++) list.push({ date: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      list.push({ date: `${month}-${String(d).padStart(2, '0')}`, day: d });
    }
    return list;
  }, [month]);

  const statusTag = (s: Schedule) =>
    s.status === 'open' ? <Tag color="success">可预约</Tag>
      : s.status === 'full' ? <Tag color="warning">已约满</Tag>
        : <Tag color="error">停诊</Tag>;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">排班管理</div>
          <div className="page-subtitle">管理医生出诊时间表，支持单日/批量排班，用户端根据排班展示可预约时段</div>
        </div>
      </div>

      <div className="schedule-toolbar">
        <Space>
          <span className="toolbar-label">筛选：</span>
          <Select style={{ width: 140 }} placeholder="全部科室" options={[]} />
          <Select style={{ width: 140 }} placeholder="全部医生" options={[]} />
          <span className="toolbar-label" style={{ marginLeft: 16 }}>日期：</span>
          <Button icon={<LeftOutlined />} size="small" onClick={() => setMonth(dayjs(`${month}-01`).subtract(1, 'month').format('YYYY-MM'))} />
          <span className="month-label">{dayjs(`${month}-01`).format('YYYY年M月')}</span>
          <Button icon={<RightOutlined />} size="small" onClick={() => setMonth(dayjs(`${month}-01`).add(1, 'month').format('YYYY-MM'))} />
          <Button size="small" onClick={() => setMonth(dayjs().format('YYYY-MM'))}>今天</Button>
        </Space>
        <Space>
          <Button>日历视图</Button>
          <Button>列表视图</Button>
          <Button>批量排班</Button>
          <Button type="primary" icon={<PlusOutlined />}>新增排班</Button>
        </Space>
      </div>

      <Card>
        <div className="legend-row">
          <span className="legend-item"><span className="dot dot-open" />可预约</span>
          <span className="legend-item"><span className="dot dot-full" />已约满</span>
          <span className="legend-item"><span className="dot dot-stopped" />停诊</span>
        </div>
        <div className="calendar-grid">
          {WEEK_HEADERS.map((w) => <div key={w} className="calendar-week-header">{w}</div>)}
          {cells.map((c, i) => {
            if (!c.date) return <div key={`e${i}`} className="calendar-cell empty" />;
            const daySchedules = schedules.filter((s) => s.date === c.date);
            return (
              <div key={c.date} className="calendar-cell">
                <div className="cell-day">{c.day}</div>
                {daySchedules.slice(0, 3).map((s) => (
                  <Tooltip key={s.id} title={`${s.doctorName} ${s.quota}/${s.booked}`}>
                    <div className={`cell-item status-${s.status}`}>
                      <span>{s.doctorName}</span>
                      <span>{s.booked}/{s.quota}</span>
                    </div>
                  </Tooltip>
                ))}
                {daySchedules.length > 3 && <div className="cell-more">+ {daySchedules.length - 3} 更多...</div>}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}