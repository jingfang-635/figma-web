import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Checkbox, Form, Input, InputNumber, Modal, Select, App } from 'antd';
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
  /** 冻结样本专用色调（am/pm/full/open/stopped）；线上数据按 slot+status 推导 */
  tone?: string;
}

const WEEK_HEADERS = ['日', '一', '二', '三', '四', '五', '六'];

/** visualGate=1 冻结 sample 数据（与原型 2026年8月 视图逐字逐色一致） */
const GATE_SCHEDULES: Schedule[] = [
  { id: 1, doctorId: 1, doctorName: '张伟', workDate: '2026-08-10', slot: 'am', quota: 30, booked: 12, status: 'open' },
  { id: 2, doctorId: 1, doctorName: '张伟', workDate: '2026-08-10', slot: 'pm', quota: 20, booked: 20, status: 'open' },
  { id: 3, doctorId: 2, doctorName: '李娜', workDate: '2026-08-10', slot: 'am', quota: 40, booked: 15, status: 'open', tone: 'open' },
  { id: 4, doctorId: 3, doctorName: '王磊', workDate: '2026-08-11', slot: 'am', quota: 25, booked: 5, status: 'open' },
  { id: 5, doctorId: 2, doctorName: '李娜', workDate: '2026-08-11', slot: 'am', quota: 20, booked: 8, status: 'open' },
  { id: 6, doctorId: 3, doctorName: '陈静', workDate: '2026-08-11', slot: 'am', quota: 30, booked: 10, status: 'open', tone: 'open' },
  { id: 7, doctorId: 4, doctorName: '刘洋', workDate: '2026-08-12', slot: 'am', quota: 20, booked: 0, status: 'open' },
  { id: 8, doctorId: 5, doctorName: '赵强', workDate: '2026-08-12', slot: 'pm', quota: 15, booked: 7, status: 'open' },
  { id: 9, doctorId: 1, doctorName: '张伟', workDate: '2026-08-14', slot: 'am', quota: 50, booked: 30, status: 'open', tone: 'open' },
  // 8/10 当天共 7 条（原型日历格显示「+ 4 更多...」）
  { id: 10, doctorId: 4, doctorName: '刘洋', workDate: '2026-08-10', slot: 'pm', quota: 20, booked: 3, status: 'open' },
  { id: 11, doctorId: 5, doctorName: '赵强', workDate: '2026-08-10', slot: 'am', quota: 20, booked: 6, status: 'open' },
  { id: 12, doctorId: 3, doctorName: '王磊', workDate: '2026-08-10', slot: 'pm', quota: 25, booked: 9, status: 'open' },
  { id: 13, doctorId: 2, doctorName: '李娜', workDate: '2026-08-10', slot: 'pm', quota: 40, booked: 11, status: 'open' },
];

/** visualGate=1 冻结的下拉选项（与原型逐字一致；原型弹窗截图为「已填写态」） */
const GATE_DOCTORS = [
  { id: 1, name: '张伟' }, { id: 2, name: '李娜' }, { id: 3, name: '王磊' },
  { id: 4, name: '陈静' }, { id: 5, name: '刘洋' }, { id: 6, name: '赵强' },
];

/** 药丸条配色：上午=青 / 下午=品红 / 已约满=橙 / 停诊=红 / 其余=可预约蓝（与 Figma 图例一致） */
function pillTone(s: Schedule): string {
  if (s.tone) return s.tone;
  if (s.status === 'stopped') return 'stopped';
  if (s.booked >= s.quota) return 'full';
  if (s.slot === 'pm') return 'pm';
  if (s.slot === 'am') return 'am';
  return 'open';
}

export default function SchedulePage() {
  const config = screenConfigs.find((s) => s.name === '排班管理');
  const gate = new URLSearchParams(window.location.search).get('visualGate') === '1';
  const todayStr = gate ? '2026-08-10' : dayjs().format('YYYY-MM-DD');
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
    api<{ id: number; name: string }[]>('/doctors')
      .then((list) => setDoctorOpts(list.map((d) => ({ value: String(d.id), label: d.name }))))
      .catch(() => setDoctorOpts([]));
    api<{ id: number; name: string }[]>('/departments')
      .then((list) => setDeptOpts(list.map((d) => ({ value: String(d.id), label: d.name }))))
      .catch(() => setDeptOpts([]));
  }, [gate]);

  /** 6×7=42 格：从本月 1 号所在周的周日开始，含跨月首尾 */
  const cells = useMemo(() => {
    const first = dayjs(`${month}-01`);
    const gridStart = first.subtract(first.day(), 'day');
    return Array.from({ length: 42 }, (_, i) => gridStart.add(i, 'day'));
  }, [month]);

  const filterDeptOpts = [{ value: 'all', label: '全部科室' }, ...deptOpts];
  const filterDoctorOpts = [{ value: 'all', label: '全部医生' }, ...doctorOpts];

  /** 批量排班预览（IR 176:105~120 的 5 行 + 汇总）。
   *  gate 下钉死原型样例；非 gate 由表单实时推导（行数上限 5，与原型一致）。 */
  const batchPreview = useMemo(() => {
    if (gate) {
      const rows = ['2026-08-09', '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13']
        .map((dt) => `${dt} — 张伟、李娜、王磊、陈静、刘洋、赵强（上午）`);
      return { rows, note: '预计生成 30 条排班记录（6 位医生 × 5 天）' };
    }
    const dateMap: Record<string, number> = { '周日': 0, '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6 };
    const base = dayjs(`${month}-01`);
    const dates: string[] = [];
    for (let d = 1; d <= base.daysInMonth() && dates.length < 5; d++) {
      const dow = base.date(d).day();
      if ((batchWeekdays || []).some((w: string) => dateMap[w] === dow)) dates.push(base.date(d).format('YYYY-MM-DD'));
    }
    const names = (batchDoctorIds || []).map((id: string) => doctorOpts.find((d) => d.value === String(id))?.label || `医生${id}`);
    const slotName = batchSlot === 'pm' ? '下午' : '上午';
    const rows = names.length ? dates.map((dt) => `${dt} — ${names.join('、')}（${slotName}）`) : [];
    const note = !names.length || !dates.length
      ? '选择医生与日期后自动生成预览'
      : `预计生成 ${names.length * dates.length} 条排班记录（${names.length} 位医生 × ${dates.length} 天）`;
    return { rows, note };
  }, [gate, batchDoctorIds, batchWeekdays, batchSlot, month, doctorOpts]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">{config?.title || '排班管理'}</div>
          <div className="page-subtitle">{config?.subtitle}</div>
        </div>
      </div>

      <Card className="schedule-card">
        <div className="schedule-toolbar">
          <div className="toolbar-left">
            <span className="toolbar-label">筛选：</span>
            <Select style={{ width: 150 }} className="toolbar-select" defaultValue="all" options={filterDeptOpts} />
            <Select style={{ width: 150 }} className="toolbar-select" defaultValue="all" options={filterDoctorOpts} />
            <span className="toolbar-divider" />
            <span className="toolbar-label">日期：</span>
            <span className="month-nav">
              <span
                className="month-arrow"
                onClick={() => setMonth(dayjs(`${month}-01`).subtract(1, 'month').format('YYYY-MM'))}
              >
                ◀
              </span>
              <span className="month-label">{dayjs(`${month}-01`).format('YYYY年M月')}</span>
              <span
                className="month-arrow"
                onClick={() => setMonth(dayjs(`${month}-01`).add(1, 'month').format('YYYY-MM'))}
              >
                ▶
              </span>
            </span>
            <span className="today-link" onClick={() => setMonth(dayjs().format('YYYY-MM'))}>今天</span>
          </div>
          <div className="toolbar-right">
            <div className="view-switch">
              <span className="view-opt active">日历视图</span>
              <span className="view-opt">列表视图</span>
            </div>
            <Button onClick={() => setBatchOpen(true)}>批量排班</Button>
            <Button type="primary" onClick={() => setCreateOpen(true)}>新增排班</Button>
          </div>
        </div>

        <div className="legend-row">
          <span className="legend-item"><span className="dot dot-open" />可预约</span>
          <span className="legend-item"><span className="dot dot-full" />已约满</span>
          <span className="legend-item"><span className="dot dot-stopped" />停诊</span>
          <span className="legend-item"><span className="dot dot-am" />上午</span>
          <span className="legend-item"><span className="dot dot-pm" />下午</span>
        </div>

        <div className="calendar-wrap">
          <div className="calendar-grid">
            {WEEK_HEADERS.map((w, i) => (
              <div key={w} className={`calendar-week-header${i === 0 || i === 6 ? ' weekend' : ''}`}>{w}</div>
            ))}
            {cells.map((d) => {
              const date = d.format('YYYY-MM-DD');
              const inMonth = d.isSame(dayjs(`${month}-01`), 'month');
              const weekend = d.day() === 0 || d.day() === 6;
              const isToday = date === todayStr;
              const daySchedules = schedules.filter((s) => s.workDate === date);
              return (
                <div
                  key={date}
                  className={`calendar-cell${weekend ? ' weekend' : ''}${inMonth ? '' : ' out'}${isToday ? ' today' : ''}`}
                >
                  <div className="cell-day">
                    {isToday ? <span className="day-badge">{d.date()}</span> : d.date()}
                  </div>
                  {daySchedules.slice(0, 3).map((s) => (
                    <div key={s.id} className={`cell-item pill-${pillTone(s)}`}>
                      <span className="cell-doctor">{s.doctorName || ''}</span>
                      <span className="cell-count">{s.booked}/{s.quota}</span>
                    </div>
                  ))}
                  {daySchedules.length > 3 && (
                    <div className="cell-more">+ {daySchedules.length - 3} 更多...</div>
                  )}
                </div>
              );
            })}
          </div>
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
        className="dept-modal schedule-modal"
      >
        <Form form={createForm} layout="horizontal" labelCol={{ flex: '100px' }} labelAlign="right" wrapperCol={{ flex: 'auto' }} colon={false}>
          <Form.Item label="选择医生" name="doctorId" className="row-h38" rules={[{ required: true, message: '请选择医生' }]}>
            <Select placeholder="请选择医生" options={doctorOpts} />
          </Form.Item>
          <Form.Item label="排班日期" name="workDate" className="row-h42" rules={[{ required: true, message: '请选择排班日期' }]} initialValue={gate ? '2026-08-10' : dayjs().format('YYYY-MM-DD')}>
            <Input placeholder={gate ? '2026-08-10' : dayjs().format('YYYY-MM-DD')} />
          </Form.Item>
          <Form.Item label="时段" name="slot" rules={[{ required: true, message: '请选择时段' }]} initialValue="am">
            <Select options={[{ value: 'am', label: '上午 (08:00 - 12:00)' }, { value: 'pm', label: '下午 (14:00 - 18:00)' }]} />
          </Form.Item>
          <Form.Item label="可预约号源" required style={{ marginBottom: 16 }}>
            <div className="quota-inline">
              <Form.Item name="quota" noStyle rules={[{ required: true, message: '请输入可预约号源' }]} initialValue={20}>
                <InputNumber min={1} max={200} style={{ width: 203 }} />
              </Form.Item>
              <div className="quota-hint">设置该时段可供患者预约的号源<br />数量（1-200）</div>
            </div>
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
          // deptId 仅作 IR 原型还原（176:60 科室下拉），不写入排班记录
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
        className="dept-modal schedule-modal batch-modal"
      >
        <Form form={batchForm} layout="horizontal" labelCol={{ flex: '100px' }} labelAlign="right" wrapperCol={{ flex: 'auto' }} colon={false}>
          <Form.Item label="模板类型" name="templateType" rules={[{ required: true }]} initialValue="week">
            <Select options={[{ value: 'week', label: '按周模板（本周/下周）' }]} />
          </Form.Item>
          <Form.Item label="选择医生" required style={{ marginBottom: 16 }}>
            <div className="pair-selects">
              <Form.Item name="deptId" noStyle initialValue="all">
                <Select style={{ width: 186 }} options={[{ value: 'all', label: '全部科室' }, ...deptOpts]} />
              </Form.Item>
              <Form.Item name="doctorIds" noStyle rules={[{ required: true, message: '请选择医生' }]}>
                <Select mode="multiple" placeholder="全部医生" className="multi-doctor" style={{ width: 186 }} options={doctorOpts} maxTagCount="responsive" />
              </Form.Item>
            </div>
          </Form.Item>
          <Form.Item label="选择排班日期" name="weekdays" className="weekday-item" rules={[{ required: true, message: '请选择排班日期' }]} initialValue={gate ? ['周一', '周二', '周三', '周四', '周五'] : undefined}>
            <Checkbox.Group className="weekday-tags" options={['周一', '周二', '周三', '周四', '周五', '周六', '周日']} />
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
            <div className="batch-preview-list">
              {batchPreview.rows.map((r) => (
                <div key={r} className="batch-preview-row">{r}</div>
              ))}
            </div>
            <div className="batch-preview-note">{batchPreview.note}</div>
          </div>
        </Form>
      </Modal>
    </div>
  );
}