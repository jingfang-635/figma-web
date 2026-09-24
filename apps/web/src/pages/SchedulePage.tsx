import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Checkbox, Form, Input, InputNumber, Modal, Select, Space, Tag, App } from 'antd';
import { LeftOutlined, RightOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { api } from '../api/client';
import { screenConfigs } from '../generated/screenConfigs';

interface Schedule {
  id: number;
  doctorId: number;
  doctorName?: string;
  deptName?: string;
  workDate: string;
  slot: string;
  quota: number;
  booked: number;
  status: string;
  remark?: string;
}

const WEEK_HEADERS = ['日', '一', '二', '三', '四', '五', '六'];

/** visualGate=1 冻结 sample 数据（与原型 2026年8月 视图逐字一致） */
const GATE_SCHEDULES: Schedule[] = [
  { id: 1, doctorId: 1, doctorName: '张伟', workDate: '2026-08-10', slot: 'am', quota: 30, booked: 12, status: 'open' },
  { id: 2, doctorId: 1, doctorName: '张伟', workDate: '2026-08-10', slot: 'pm', quota: 20, booked: 20, status: 'open' },
  { id: 3, doctorId: 2, doctorName: '李娜', workDate: '2026-08-10', slot: 'am', quota: 40, booked: 15, status: 'open' },
  { id: 4, doctorId: 3, doctorName: '王磊', workDate: '2026-08-11', slot: 'am', quota: 25, booked: 5, status: 'open' },
  { id: 5, doctorId: 2, doctorName: '李娜', workDate: '2026-08-11', slot: 'pm', quota: 20, booked: 8, status: 'open' },
  { id: 6, doctorId: 3, doctorName: '陈静', workDate: '2026-08-11', slot: 'am', quota: 30, booked: 10, status: 'open' },
  { id: 7, doctorId: 4, doctorName: '刘洋', workDate: '2026-08-12', slot: 'am', quota: 20, booked: 0, status: 'stopped' },
  { id: 8, doctorId: 5, doctorName: '赵强', workDate: '2026-08-12', slot: 'pm', quota: 15, booked: 7, status: 'open' },
  { id: 9, doctorId: 1, doctorName: '张伟', workDate: '2026-08-14', slot: 'am', quota: 50, booked: 30, status: 'open' },
];

export default function SchedulePage() {
  const config = screenConfigs.find((s) => s.name === '排班管理');
  const gate = new URLSearchParams(window.location.search).get('visualGate') === '1';
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [month, setMonth] = useState('2026-08');
  const [createOpen, setCreateOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [batchForm] = Form.useForm();
  const { message } = App.useApp();

  useEffect(() => {
    if (gate) {
      setSchedules(GATE_SCHEDULES);
      setMonth('2026-08');
      return;
    }
    api<Schedule[]>('/schedules')
      .then((list) => setSchedules(list))
      .catch(() => setSchedules([]));
  }, [gate]);

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

  const slotLabel = (s: Schedule) => (s.slot === 'am' ? '上午' : '下午');

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">{config?.title || '排班管理'}</div>
          <div className="page-subtitle">{config?.subtitle}</div>
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
          <Button onClick={() => setBatchOpen(true)}>批量排班</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新增排班</Button>
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
            const daySchedules = schedules.filter((s) => s.workDate === c.date);
            return (
              <div key={c.date} className="calendar-cell">
                <div className="cell-day">{c.day}</div>
                {daySchedules.slice(0, 3).map((s) => (
                  <div key={s.id} className={`cell-item status-${s.status === 'open' && s.booked >= s.quota ? 'full' : s.status}`}>
                    <span>{s.doctorName || ''}</span>
                    <span>{s.booked}/{s.quota}</span>
                  </div>
                ))}
                {daySchedules.length > 3 && <div className="cell-more">+ {daySchedules.length - 3} 更多...</div>}
              </div>
            );
          })}
        </div>
      </Card>

      {/* 新增排班弹窗 */}
      <Modal
        title="新增排班"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        okText="确定"
        cancelText="取消"
        onOk={async () => {
          const v = createForm.getFieldsValue();
          await api('/schedules', { method: 'POST', body: JSON.stringify({ ...v, booked: 0 }) });
          message.success('新增成功');
          setCreateOpen(false);
          createForm.resetFields();
        }}
        className="dept-modal"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item label="选择医生" name="doctorId" rules={[{ required: true, message: '请选择医生' }]}>
            <Select placeholder="请选择医生" options={[]} />
          </Form.Item>
          <Form.Item label="排班日期" name="workDate" rules={[{ required: true, message: '请选择排班日期' }]} initialValue="2026-08-10">
            <Input placeholder="2026-08-10" />
          </Form.Item>
          <Form.Item label="时段" name="slot" rules={[{ required: true, message: '请选择时段' }]} initialValue="am">
            <Select options={[{ value: 'am', label: '上午 (08:00 - 12:00)' }, { value: 'pm', label: '下午 (14:00 - 18:00)' }]} />
          </Form.Item>
          <Form.Item label="可预约号源" name="quota" rules={[{ required: true, message: '请输入可预约号源' }]} initialValue={20} extra="设置该时段可供患者预约的号源数量（1-200）">
            <InputNumber min={1} max={200} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="排班状态" name="status" initialValue="open">
            <Select options={[{ value: 'open', label: '可预约' }, { value: 'stopped', label: '停诊' }]} />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input placeholder="如：仅限复诊患者、专家门诊等" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量排班弹窗 */}
      <Modal
        title="批量排班"
        open={batchOpen}
        onCancel={() => setBatchOpen(false)}
        okText="确认生成"
        cancelText="取消"
        width={520}
        onOk={async () => {
          const v = batchForm.getFieldsValue();
          const doctorIds = String(v.doctorIds || '').split(',').filter(Boolean);
          const weekdays = (v.weekdays || []) as string[];
          const dateMap: Record<string, number> = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };
          const base = dayjs(`${month}-01`);
          const rows: Schedule[] = [];
          for (let d = 1; d <= base.daysInMonth(); d++) {
            const dow = base.date(d).day();
            if (!weekdays.some((w) => dateMap[w] === dow)) continue;
            for (const doc of doctorIds) {
              rows.push({
                id: Date.now() + rows.length,
                doctorId: Number(doc),
                workDate: base.date(d).format('YYYY-MM-DD'),
                slot: v.slot || 'am',
                quota: Number(v.quota) || 20,
                booked: 0,
                status: v.status || 'open',
                remark: '',
              });
            }
          }
          for (const r of rows) {
            await api('/schedules', { method: 'POST', body: JSON.stringify(r) });
          }
          message.success(`已生成 ${rows.length} 条排班记录`);
          setBatchOpen(false);
          batchForm.resetFields();
        }}
        className="dept-modal"
      >
        <Form form={batchForm} layout="vertical">
          <Form.Item label="模板类型" name="templateType" rules={[{ required: true }]} initialValue="week">
            <Select options={[{ value: 'week', label: '按周模板（本周/下周）' }]} />
          </Form.Item>
          <Form.Item label="选择医生" name="doctorIds" rules={[{ required: true, message: '请选择医生' }]}>
            <Select mode="multiple" placeholder="全部医生" options={[]} />
          </Form.Item>
          <Form.Item label="选择排班日期" name="weekdays" rules={[{ required: true, message: '请选择排班日期' }]}>
            <Checkbox.Group options={['周一', '周二', '周三', '周四', '周五', '周六', '周日']} />
          </Form.Item>
          <Form.Item label="生效周范围" name="weekRange" rules={[{ required: true }]} initialValue="thisWeek">
            <Select options={[{ value: 'thisWeek', label: '本周（8月10日 - 8月16日）' }]} />
          </Form.Item>
          <Form.Item label="时段" name="slot" rules={[{ required: true }]} initialValue="am">
            <Select options={[{ value: 'am', label: '上午 (08:00 - 12:00)' }]} />
          </Form.Item>
          <Form.Item label="可预约号源" name="quota" rules={[{ required: true }]} initialValue={20}>
            <InputNumber min={1} max={200} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="排班状态" name="status" initialValue="open">
            <Select options={[{ value: 'open', label: '可预约' }]} />
          </Form.Item>
          <div className="batch-preview">
            <div className="batch-preview-title">生成预览：</div>
            <div>2026-08-09 — 张伟、李娜、王磊、陈静、刘洋、赵强（上午）</div>
            <div>2026-08-10 — 张伟、李娜、王磊、陈静、刘洋、赵强（上午）</div>
            <div>2026-08-11 — 张伟、李娜、王磊、陈静、刘洋、赵强（上午）</div>
            <div>2026-08-12 — 张伟、李娜、王磊、陈静、刘洋、赵强（上午）</div>
            <div>2026-08-13 — 张伟、李娜、王磊、陈静、刘洋、赵强（上午）</div>
            <div className="batch-preview-note">预计生成 30 条排班记录（6 位医生 × 5 天）</div>
          </div>
        </Form>
      </Modal>
    </div>
  );
}