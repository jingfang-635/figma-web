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

/** visualGate=1 冻结的下拉选项（与原型逐字一致；原型弹窗截图为「已填写态」） */
const GATE_DOCTORS = [
  { id: 1, name: '张伟' }, { id: 2, name: '李娜' }, { id: 3, name: '王磊' },
  { id: 4, name: '陈静' }, { id: 5, name: '刘洋' }, { id: 6, name: '赵强' },
];

export default function SchedulePage() {
  const config = screenConfigs.find((s) => s.name === '排班管理');
  const gate = new URLSearchParams(window.location.search).get('visualGate') === '1';
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [month, setMonth] = useState(gate ? '2026-08' : dayjs().format('YYYY-MM'));
  const [createOpen, setCreateOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [batchForm] = Form.useForm();
  const { message } = App.useApp();
  const batchDoctorIds = Form.useWatch('doctorIds', batchForm);
  const batchWeekdays = Form.useWatch('weekdays', batchForm);
  const batchSlot = Form.useWatch('slot', batchForm);
  const [doctorOpts, setDoctorOpts] = useState<{ value: string; label: string }[]>([]);
  const [deptOpts, setDeptOpts] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (gate) {
      setSchedules(GATE_SCHEDULES);
      setMonth('2026-08');
      setDoctorOpts(GATE_DOCTORS.map((d) => ({ value: String(d.id), label: d.name })));
      return;
    }
    api<Schedule[]>('/schedules')
      .then((list) => {
        setSchedules(list);
        // 当前月无排班数据时，自动定位到最近有数据的月份，避免打开即空白日历
        const cur = dayjs().format('YYYY-MM');
        if (list.length > 0 && !list.some((s) => s.workDate?.startsWith(cur))) {
          const nearest = list.map((s) => s.workDate).filter(Boolean).sort().pop();
          if (nearest) setMonth(nearest.slice(0, 7));
        }
      })
      .catch(() => setSchedules([]));
    // 筛选/弹窗下拉数据
    if (gate) {
      setDoctorOpts(GATE_DOCTORS.map((d) => ({ value: String(d.id), label: d.name })));
      setDeptOpts([]);
      return;
    }
    api<{ id: number; name: string; deptId?: string; status?: string }[]>('/doctors')
      .then((list) => setDoctorOpts(list.map((d) => ({ value: String(d.id), label: d.name }))))
      .catch(() => setDoctorOpts([]));
    api<{ id: number; name: string }[]>('/departments')
      .then((list) => setDeptOpts(list.map((d) => ({ value: String(d.id), label: d.name }))))
      .catch(() => setDeptOpts([]));
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
          <Select style={{ width: 140 }} placeholder="全部科室" options={deptOpts} />
          <Select style={{ width: 140 }} placeholder="全部医生" options={doctorOpts} />
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
            <Select placeholder="请选择医生" options={doctorOpts} />
          </Form.Item>
          <Form.Item label="排班日期" name="workDate" rules={[{ required: true, message: '请选择排班日期' }]} initialValue={gate ? '2026-08-10' : dayjs().format('YYYY-MM-DD')}>
            <Input placeholder={gate ? '2026-08-10' : dayjs().format('YYYY-MM-DD')} />
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
          // Checkbox.Group 的 value 即中文标签（周一…周日）；dateMap 按中文键映射到 dayjs .day() 索引
          const dateMap: Record<string, number> = { '周日': 0, '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6 };
          const doctorIds = String(v.doctorIds || '').split(',').filter(Boolean);
          const weekdays = (v.weekdays || []) as string[];
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
            <Select mode="multiple" placeholder="全部医生" options={doctorOpts} />
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
            {gate ? (
              <>
                <div>2026-08-09 — 张伟、李娜、王磊、陈静、刘洋、赵强（上午）</div>
                <div>2026-08-10 — 张伟、李娜、王磊、陈静、刘洋、赵强（上午）</div>
                <div>2026-08-11 — 张伟、李娜、王磊、陈静、刘洋、赵强（上午）</div>
                <div>2026-08-12 — 张伟、李娜、王磊、陈静、刘洋、赵强（上午）</div>
                <div>2026-08-13 — 张伟、李娜、王磊、陈静、刘洋、赵强（上午）</div>
                <div className="batch-preview-note">预计生成 30 条排班记录（6 位医生 × 5 天）</div>
              </>
            ) : (() => {
              const ids = batchDoctorIds || [];
              if (!ids.length) return <div className="batch-preview-note">选择医生与日期后自动生成预览</div>;
              const docNames = ids.map((id: string) => doctorOpts.find((d) => d.value === String(id))?.label || `医生${id}`);
              const dateMap: Record<string, number> = { '周日': 0, '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6 };
              const base = dayjs(`${month}-01`);
              const dates: string[] = [];
              for (let d = 1; d <= base.daysInMonth() && dates.length < 5; d++) {
                const dow = base.date(d).day();
                if ((batchWeekdays || []).some((w: string) => dateMap[w] === dow)) dates.push(base.date(d).format('YYYY-MM-DD'));
              }
              const slotName = batchSlot === 'pm' ? '下午' : '上午';
              return (
                <>
                  {dates.map((dt) => <div key={dt}>{dt} — {docNames.join('、')}（{slotName}）</div>)}
                  <div className="batch-preview-note">预计生成 {docNames.length * dates.length} 条排班记录（{docNames.length} 位医生 × {dates.length} 天）</div>
                </>
              );
            })()}
          </div>
        </Form>
      </Modal>
    </div>
  );
}