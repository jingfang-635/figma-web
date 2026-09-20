import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { CalendarOutlined, UnorderedListOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createResource,
  deleteResource,
  fetchResourceList,
  updateResource,
} from '../api/client';
import schedulesBlueprint from '../blueprints/schedules.json';
import { PageHeaderBlock } from '../components/chrome/PageBlocks';
import { isVisualGate } from '../visual/gate';

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAYS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
];
const SLOTS = [
  { value: '08:00-12:00', label: '上午 (08:00 - 12:00)', start: '08:00', end: '12:00' },
  { value: '14:00-17:00', label: '下午 (14:00 - 17:00)', start: '14:00', end: '17:00' },
];

function slotOf(start?: unknown, end?: unknown) {
  const key = `${String(start ?? '')}-${String(end ?? '')}`;
  return SLOTS.some((s) => s.value === key) ? key : SLOTS[0].value;
}

function parseSlot(value: string) {
  const hit = SLOTS.find((s) => s.value === value) ?? SLOTS[0];
  return { startTime: hit.start, endTime: hit.end };
}

function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = first.getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells: Array<{ date: string; day: number; outside: boolean }> = [];
  for (let i = start - 1; i >= 0; i--) {
    const d = prevDays - i;
    const y = month === 0 ? year - 1 : year;
    const m = month === 0 ? 12 : month;
    cells.push({
      date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      day: d,
      outside: true,
    });
  }
  for (let d = 1; d <= days; d++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ date, day: d, outside: false });
  }
  let n = 1;
  const nextY = month === 11 ? year + 1 : year;
  const nextM = month === 11 ? 1 : month + 2;
  while (cells.length % 7 !== 0) {
    cells.push({
      date: `${nextY}-${String(nextM).padStart(2, '0')}-${String(n).padStart(2, '0')}`,
      day: n,
      outside: true,
    });
    n += 1;
  }
  return cells;
}

function chipClass(item: Record<string, unknown>) {
  const tone = String(item.tone ?? '');
  if (tone) return tone;
  if (item.status === 'cancelled') return 'cancelled';
  if (item.status === 'full' || Number(item.booked) >= Number(item.quota)) return 'full';
  const hour = Number(String(item.startTime ?? '').slice(0, 2));
  return hour < 12 ? 'morning' : 'afternoon';
}

export function SchedulePage() {
  const bp = schedulesBlueprint;
  const gate = isVisualGate();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [appointments, setAppointments] = useState<Record<string, unknown>[]>([]);
  const [doctors, setDoctors] = useState<Record<string, unknown>[]>([]);
  const [departments, setDepartments] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [cursor, setCursor] = useState(() =>
    isVisualGate() && schedulesBlueprint.sample?.cursor
      ? dayjs(schedulesBlueprint.sample.cursor)
      : dayjs(),
  );
  const [selectedDate, setSelectedDate] = useState(() =>
    isVisualGate() ? '2026-08-10' : dayjs().format('YYYY-MM-DD'),
  );
  const [deptFilter, setDeptFilter] = useState<string | undefined>();
  const [doctorFilter, setDoctorFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [deleteRow, setDeleteRow] = useState<Record<string, unknown> | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, d, dept] = await Promise.all([
        fetchResourceList('schedules'),
        fetchResourceList('appointments'),
        fetchResourceList('doctors'),
        fetchResourceList('departments'),
      ]);
      const live = s.data ?? [];
      setRows(gate && bp.sample?.rows?.length ? bp.sample.rows : live);
      setAppointments(a.data ?? []);
      setDoctors(d.data ?? []);
      setDepartments(dept.data ?? []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [gate, bp.sample?.rows]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = rows;
    if (deptFilter) {
      const ids = new Set(
        doctors
          .filter((d) => String(d.departmentId) === deptFilter)
          .map((d) => String(d.id)),
      );
      list = list.filter((r) => ids.has(String(r.doctorId)));
    }
    if (doctorFilter) list = list.filter((r) => String(r.doctorId) === doctorFilter);
    return list;
  }, [rows, doctorFilter, deptFilter, doctors]);

  const year = cursor.year();
  const month = cursor.month();
  const cells = monthCells(year, month);

  const bookedOf = (item: Record<string, unknown>) =>
    item.booked != null
      ? Number(item.booked)
      : appointments.filter((a) => String(a.scheduleId) === String(item.id)).length;

  const deptOptions = departments.map((d) => ({
    value: String(d.id),
    label: String(d.name),
  }));
  const doctorOptions = doctors
    .filter((d) => !deptFilter || String(d.departmentId) === deptFilter)
    .map((d) => ({
      value: String(d.id),
      label: String(d.name),
    }));

  const openCreate = (date?: string) => {
    setEditing(null);
    form.setFieldsValue({
      doctorId: doctorFilter ? Number(doctorFilter) : undefined,
      date: date ? dayjs(date) : dayjs(),
      slot: '08:00-12:00',
      quota: 20,
      status: 'available',
      remark: '',
    });
    setModalOpen(true);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditing(row);
    form.setFieldsValue({
      doctorId: row.doctorId,
      date: dayjs(String(row.date)),
      slot: slotOf(row.startTime, row.endTime),
      quota: row.quota,
      status: row.status,
      remark: row.remark ?? '',
    });
    setModalOpen(true);
  };

  const tryDelete = (row: Record<string, unknown>) => {
    setDeleteReason('');
    setDeleteRow(row);
  };

  const bookedCount = (row: Record<string, unknown> | null) =>
    row ? appointments.filter((a) => String(a.scheduleId) === String(row.id)).length : 0;

  const confirmDelete = async () => {
    if (!deleteRow) return;
    const count = bookedCount(deleteRow);
    if (count > 0 && !deleteReason.trim()) {
      message.warning('请输入删除原因');
      return;
    }
    await deleteResource('schedules', deleteRow.id as number);
    message.success(count > 0 ? '已强制删除并通知患者' : '已删除');
    setDeleteRow(null);
    await load();
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const { startTime, endTime } = parseSlot(String(values.slot));
      const payload = {
        doctorId: Number(values.doctorId),
        date: (values.date as Dayjs).format('YYYY-MM-DD'),
        startTime,
        endTime,
        quota: Number(values.quota),
        status: values.status,
        remark: values.remark || null,
      };
      if (editing?.id != null) await updateResource('schedules', editing.id as number, payload);
      else await createResource('schedules', payload);
      message.success('保存成功');
      setModalOpen(false);
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleBatch = async () => {
    const values = await batchForm.validateFields();
    setSaving(true);
    try {
      const weekdays: number[] = values.weekdays ?? [1, 2, 3, 4, 5];
      const { startTime, endTime } = parseSlot(String(values.slot || '08:00-12:00'));
      const startOfWeek = (values.weekRange === 'next' ? dayjs().add(1, 'week') : dayjs()).startOf('week');
      const doctorIds = values.doctorId
        ? [Number(values.doctorId)]
        : doctors
            .filter((d) => !values.departmentId || String(d.departmentId) === String(values.departmentId))
            .map((d) => Number(d.id));
      let created = 0;
      for (let i = 0; i < 7; i++) {
        const date = startOfWeek.add(i, 'day');
        if (!weekdays.includes(date.day())) continue;
        const dateStr = date.format('YYYY-MM-DD');
        for (const doctorId of doctorIds) {
          await createResource('schedules', {
            doctorId,
            date: dateStr,
            startTime,
            endTime,
            quota: Number(values.quota || 20),
            status: values.status || 'available',
          });
          created += 1;
        }
      }
      message.success(`已生成 ${created} 条排班`);
      setBatchOpen(false);
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '批量排班失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeaderBlock title={bp.pageHeader.title} subtitle={bp.pageHeader.subtitle} />
      <Card className="schedule-card" bordered={false}>
        <div className="schedule-toolbar">
          <span className="tb-label">筛选：</span>
          <Select
            placeholder="全部科室"
            allowClear
            className="tb-select"
            options={deptOptions}
            value={deptFilter}
            onChange={(v) => {
              setDeptFilter(v);
              setDoctorFilter(undefined);
            }}
          />
          <Select
            allowClear
            placeholder="全部医生"
            className="tb-select"
            options={doctorOptions}
            value={doctorFilter}
            onChange={setDoctorFilter}
          />
          <span className="tb-div" />
          <span className="tb-label">日期：</span>
          <button type="button" className="tb-nav" onClick={() => setCursor((c) => c.subtract(1, 'month'))}>
            ◀
          </button>
          <span className="tb-month">
            {year}年{month + 1}月
          </span>
          <button type="button" className="tb-nav" onClick={() => setCursor((c) => c.add(1, 'month'))}>
            ▶
          </button>
          <Button className="tb-today" onClick={() => setCursor(dayjs())}>
            今天
          </Button>
          <span className="tb-div" />
          <div className="tb-views">
            <button
              type="button"
              className={view === 'calendar' ? 'active' : ''}
              onClick={() => setView('calendar')}
            >
              <CalendarOutlined style={{ fontSize: 12 }} />
              {' '}日历视图
            </button>
            <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
              <UnorderedListOutlined style={{ fontSize: 12 }} />
              {' '}列表视图
            </button>
          </div>
          <Button
            className="tb-batch"
            onClick={() => {
              batchForm.setFieldsValue({
                templateType: 'weekly',
                departmentId: deptFilter ? Number(deptFilter) : undefined,
                doctorId: doctorFilter ? Number(doctorFilter) : undefined,
                weekdays: [1, 2, 3, 4, 5],
                weekRange: 'this',
                slot: '08:00-12:00',
                quota: 20,
                status: 'available',
              });
              setBatchOpen(true);
            }}
          >
            <CalendarOutlined style={{ fontSize: 12 }} />
            {' '}批量排班
          </Button>
          <Button type="primary" className="tb-create" onClick={() => openCreate()}>
            ＋ 新增排班
          </Button>
        </div>
        <div className="legend-row">
          {bp.calendar.legend.map((l) => (
            <span key={l.label}>
              <i className="legend-dot" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
        {view === 'calendar' ? (
          <div className="cal-grid">
            {WEEK.map((w, i) => (
              <div key={w} className={`cal-head${i === 0 || i === 6 ? ' weekend' : ''}`}>
                {w}
              </div>
            ))}
            {cells.map((cell, i) => {
              const items = filtered.filter((r) => r.date === cell.date);
              const shown = items.slice(0, 3);
              const extra = items.length - shown.length;
              const selected = !cell.outside && cell.date === selectedDate;
              return (
                <div
                  key={i}
                  className={`cal-cell${cell.outside ? ' outside' : ''}${selected ? ' is-selected' : ''}`}
                  onClick={() => !cell.outside && setSelectedDate(cell.date)}
                  onDoubleClick={() => !cell.outside && openCreate(cell.date)}
                >
                  <span className={`cal-day${selected ? ' selected' : ''}`}>{cell.day}</span>
                  {shown.map((item) => {
                    const doctor = item.doctor as Record<string, unknown> | undefined;
                    return (
                      <button
                        key={String(item.id)}
                        type="button"
                        className={`cal-chip ${chipClass(item)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(item);
                        }}
                      >
                        <span>{String(doctor?.name ?? '医生')}</span>
                        <span>
                          {bookedOf(item)}/{String(item.quota ?? 0)}
                        </span>
                      </button>
                    );
                  })}
                  {extra > 0 ? (
                    <span className="cal-more">+ {extra} 更多...</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <Table
            rowKey="id"
            loading={loading}
            dataSource={filtered}
            pagination={{ showTotal: (t) => `共 ${t} 条记录` }}
            columns={[
              {
                title: '医生',
                render: (_, r) => String((r.doctor as Record<string, unknown> | undefined)?.name ?? '-'),
              },
              { title: '日期', dataIndex: 'date' },
              { title: '开始', dataIndex: 'startTime' },
              { title: '结束', dataIndex: 'endTime' },
              { title: '号源', dataIndex: 'quota' },
              {
                title: '状态',
                dataIndex: 'status',
                render: (s: string) =>
                  s === 'available' ? (
                    <Tag color="processing">可预约</Tag>
                  ) : s === 'full' ? (
                    <Tag color="warning">已约满</Tag>
                  ) : (
                    <Tag color="error">停诊</Tag>
                  ),
              },
              {
                title: '操作',
                render: (_, r) => (
                  <Space>
                    <Button type="link" size="small" onClick={() => openEdit(r)}>
                      编辑
                    </Button>
                    <Button type="link" size="small" danger onClick={() => tryDelete(r)}>
                      删除
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal
        title={editing ? '编辑排班' : '新增排班'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void handleSubmit()}
        confirmLoading={saving}
        okText="确定"
        cancelText="取消"
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} style={{ marginTop: 16 }}>
          <Form.Item name="doctorId" label="选择医生" rules={[{ required: true, message: '请选择医生' }]}>
            <Select placeholder="请选择医生" options={doctorOptions.map((o) => ({ value: Number(o.value), label: o.label }))} />
          </Form.Item>
          <Form.Item name="date" label="排班日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="slot" label="时段" rules={[{ required: true }]}>
            <Select options={SLOTS.map((s) => ({ value: s.value, label: s.label }))} />
          </Form.Item>
          <Form.Item
            name="quota"
            label="可预约号源"
            extra="设置该时段可供患者预约的号源数量（1-200）"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} max={200} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="排班状态">
            <Select
              options={[
                { value: 'available', label: '可预约' },
                { value: 'full', label: '已约满' },
                { value: 'cancelled', label: '停诊' },
              ]}
            />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input placeholder="如：仅限复诊患者、专家门诊等" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="批量排班"
        open={batchOpen}
        onCancel={() => setBatchOpen(false)}
        onOk={() => void handleBatch()}
        confirmLoading={saving}
        okText="确认生成"
        cancelText="取消"
        width={520}
        destroyOnClose
      >
        <Form form={batchForm} layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} style={{ marginTop: 16 }}>
          <Form.Item name="templateType" label="模板类型" rules={[{ required: true }]}>
            <Select options={[{ value: 'weekly', label: '按周模板（本周/下周）' }]} />
          </Form.Item>
          <Form.Item name="departmentId" label="选择科室">
            <Select allowClear placeholder="全部科室" options={deptOptions.map((o) => ({ value: Number(o.value), label: o.label }))} />
          </Form.Item>
          <Form.Item name="doctorId" label="选择医生">
            <Select allowClear placeholder="全部医生" options={doctorOptions.map((o) => ({ value: Number(o.value), label: o.label }))} />
          </Form.Item>
          <Form.Item name="weekdays" label="选择排班日期" rules={[{ required: true }]}>
            <Checkbox.Group options={WEEKDAYS.map((d) => ({ value: d.value, label: d.label }))} />
          </Form.Item>
          <Form.Item name="weekRange" label="生效周范围" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'this', label: '本周' },
                { value: 'next', label: '下周' },
              ]}
            />
          </Form.Item>
          <Form.Item name="slot" label="时段" rules={[{ required: true }]}>
            <Select options={SLOTS.map((s) => ({ value: s.value, label: s.label }))} />
          </Form.Item>
          <Form.Item name="quota" label="可预约号源">
            <InputNumber min={1} max={200} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="排班状态">
            <Select
              options={[
                { value: 'available', label: '可预约' },
                { value: 'full', label: '已约满' },
                { value: 'cancelled', label: '停诊' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="确认删除"
        open={Boolean(deleteRow)}
        onCancel={() => setDeleteRow(null)}
        onOk={() => void confirmDelete()}
        okText={bookedCount(deleteRow) > 0 ? '强制删除（已通知患者）' : '确定'}
        okButtonProps={{ danger: true }}
        cancelText="取消"
        width={580}
      >
        {bookedCount(deleteRow) > 0 ? (
          <div style={{ marginBottom: 12 }}>
            <Typography.Text strong>该排班已有患者预约</Typography.Text>
            <div style={{ color: '#6b7280', marginTop: 4 }}>
              当前已有 {bookedCount(deleteRow)} 位患者预约了此排班。删除后将自动通知患者并退款，请谨慎操作。
            </div>
          </div>
        ) : null}
        <Typography.Paragraph>确定要删除此排班记录吗？</Typography.Paragraph>
        {deleteRow ? (
          <div style={{ background: '#fafafa', padding: 12, borderRadius: 8, marginBottom: 12 }}>
            <div>医生：{String((deleteRow.doctor as Record<string, unknown> | undefined)?.name ?? '-')}</div>
            <div>日期：{String(deleteRow.date)}</div>
            <div>
              时段：{String(deleteRow.startTime)}-{String(deleteRow.endTime)}
            </div>
            <div>号源：{String(deleteRow.quota ?? '-')}</div>
            <div>已预约：{bookedCount(deleteRow)}</div>
          </div>
        ) : null}
        {bookedCount(deleteRow) > 0 ? (
          <Input.TextArea
            rows={2}
            placeholder="请输入删除原因（如有预约将通知患者）"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
          />
        ) : null}
      </Modal>
    </div>
  );
}
