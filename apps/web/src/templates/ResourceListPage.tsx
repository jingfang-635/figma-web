import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createResource,
  deleteResource,
  fetchResourceList,
  updateResource,
} from '../api/client';
import type { FormFieldConfig, ScreenConfig, ScreenSection } from '../generated/screenConfigs';
import { KpiRow, PageHeaderBlock } from '../components/chrome/PageBlocks';
import { useStats } from '../components/chrome/StatsContext';
import { isVisualGate } from '../visual/gate';
import { LIST_GATE_DEPTS, LIST_GATE_FORM, LIST_GATE_KPI, LIST_GATE_ROWS } from '../visual/listGateSamples';

const { TextArea } = Input;

const DEFAULT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: '启用', color: 'success' },
  inactive: { label: '停用', color: 'default' },
  available: { label: '可预约', color: 'processing' },
  full: { label: '已约满', color: 'warning' },
  cancelled: { label: '已取消', color: 'error' },
  pending: { label: '待处理', color: 'warning' },
  confirmed: { label: '已确认', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  paid: { label: '已支付', color: 'success' },
  refunded: { label: '已退款', color: 'default' },
  published: { label: '已发布', color: 'success' },
  draft: { label: '草稿', color: 'default' },
  unread: { label: '未读', color: 'warning' },
  read: { label: '已读', color: 'default' },
  replied: { label: '已回复', color: 'success' },
  hidden: { label: '已隐藏', color: 'default' },
};

function getPath(row: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, row);
}

function formatDate(value: unknown): string {
  if (!value) return '-';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (raw.includes('T00:00') || raw.slice(11, 16) === '00:00') return raw.slice(0, 10);
  return raw.length >= 16 ? raw.replace('T', ' ').slice(0, 16) : raw;
}

function maskPhone(value: unknown): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length >= 7) return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
  return value == null || value === '' ? '-' : String(value);
}

function formatMoney(value: unknown, cents: boolean): string {
  const n = Number(value);
  if (Number.isNaN(n)) return '-';
  return cents ? `¥${n.toFixed(2)}` : `¥${n}`;
}

function localYmd(d = new Date()): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function deriveListKpi(
  route: string,
  rows: Record<string, unknown>[],
  stats: Record<string, string | number>,
): Record<string, string | number> {
  const today = localYmd();
  const month = today.slice(0, 7);
  if (route === '/patients') {
    return {
      totalPatients: rows.length || Number(stats.totalPatients ?? stats.patients ?? 0),
      todayNew: rows.filter((r) => String(r.createdAt ?? '').slice(0, 10) === today).length,
      monthAppointments: Number(stats.monthAppointments ?? stats.appointments ?? 0),
      blacklist: rows.filter(
        (r) => r.status === 'blacklisted' || String(r.tags ?? '').includes('黑名单'),
      ).length,
    };
  }
  if (route === '/orders') {
    const dayKey = (r: Record<string, unknown>) => String(r.paidAt ?? r.createdAt ?? '').slice(0, 10);
    const todayRows = rows.filter((r) => dayKey(r) === today);
    const monthRows = rows.filter((r) => dayKey(r).slice(0, 7) === month);
    const sumPaid = (list: Record<string, unknown>[]) =>
      list
        .filter((r) => r.status === 'paid' || r.status === 'refunded')
        .reduce((acc, r) => acc + Number(r.amount ?? 0), 0);
    return {
      todayOrders: Number(stats.todayOrders) || todayRows.length,
      todayIncome: stats.todayIncome ?? sumPaid(todayRows.filter((r) => r.status === 'paid')),
      pendingRefunds: Number(stats.pendingRefunds) || 0,
      monthIncome: stats.monthIncome ?? sumPaid(monthRows),
    };
  }
  return {
    departments: stats.departments ?? 0,
    doctors: stats.doctors ?? 0,
    pendingAppointments: stats.pendingAppointments ?? 0,
    todayAppointments: stats.todayAppointments ?? 0,
  };
}

function formatKpiValue(key: string, value: string | number | undefined): string | number {
  if (value == null || value === '') return 0;
  if (typeof value === 'string') return value;
  if (/income/i.test(key)) {
    return `¥${Math.round(value).toLocaleString('zh-CN')}`;
  }
  return value;
}

function renderStars(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '-';
  return <span className="list-stars">{'⭐'.repeat(Math.min(5, Math.round(n)))}</span>;
}

function renderTags(value: unknown) {
  if (value == null || value === '') return '-';
  const items = Array.isArray(value)
    ? value.map(String)
    : String(value)
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean);
  return (
    <Space size={4} wrap>
      {items.map((t) => {
        if (t === '慢性病患者') return <Tag key={t} color="blue">{t}</Tag>;
        if (t === 'VIP') return <Tag key={t} color="blue" variant="outlined">{t}</Tag>;
        if (t === '黑名单') return <Tag key={t} color="red" variant="outlined">{t}</Tag>;
        return <Tag key={t}>{t}</Tag>;
      })}
    </Space>
  );
}

/**
 * 表单模板屏（如 预约规则）：渲染卡片标题 + 保存按钮 + 字段（含 hint 说明），
 * 字段/按钮文案均以 screenConfigs（源自 Figma）为准，禁止退化为列表+弹窗。
 */
function FormConfigPage({ config }: { config: ScreenConfig }) {
  const { formCard, formFields } = config;
  const resource = config.resource!;
  const [form] = Form.useForm();
  const [recordId, setRecordId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const gate = isVisualGate();

  useEffect(() => {
    let cancelled = false;
    const frozen = LIST_GATE_FORM[config.route];
    fetchResourceList(resource)
      .then((res) => {
        if (cancelled) return;
        const first = (res.data ?? [])[0] as Record<string, unknown> | undefined;
        if (first) setRecordId(Number(first.id));
        if (gate && frozen) {
          form.setFieldsValue(frozen);
          return;
        }
        if (!first) return;
        form.setFieldsValue(
          Object.fromEntries(formFields.map((f) => [f.key, first[f.key] ?? undefined])),
        );
      })
      .catch((err) => message.error(err instanceof Error ? err.message : '加载失败'));
    return () => {
      cancelled = true;
    };
  }, [resource, form, formFields, gate, config.route]);

  const save = async () => {
    if (recordId == null) {
      message.warning('暂无配置数据，请先在数据层初始化');
      return;
    }
    const values = await form.validateFields();
    const payload: Record<string, unknown> = { ...values };
    for (const field of formFields) {
      if (field.type === 'number' && payload[field.key] != null && payload[field.key] !== '') {
        payload[field.key] = Number(payload[field.key]);
      }
    }
    setSaving(true);
    try {
      await updateResource(resource, recordId, payload);
      message.success('保存成功');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeaderBlock title={config.title} subtitle={config.subtitle} />
      <Card
        className="rules-card"
        title={formCard?.title ?? config.title}
        extra={
          <Button type="primary" loading={saving} onClick={() => void save()}>
            {formCard?.primaryAction ?? '保存'}
          </Button>
        }
      >
        <Form
          form={form}
          layout="horizontal"
          className="rules-form"
          requiredMark={false}
          colon={false}
          labelCol={{ flex: '90px' }}
          wrapperCol={{ flex: 1 }}
          labelAlign="left"
        >
          <Row gutter={24}>
            {formFields.map((field) => {
              const input =
                field.type === 'select' ? (
                  <Select
                    options={field.options?.map((o) => ({ value: o.value, label: o.label }))}
                    placeholder={`请选择${field.label}`}
                    style={{ width: '100%' }}
                  />
                ) : field.type === 'textarea' ? (
                  <TextArea rows={3} />
                ) : (
                  <Input />
                );
              return (
                <Col key={field.key} span={12}>
                  <Form.Item
                    name={field.key}
                    label={field.label}
                    extra={field.hint}
                    rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : undefined}
                  >
                    {input}
                  </Form.Item>
                </Col>
              );
            })}
          </Row>
        </Form>
      </Card>
    </div>
  );
}

/** 多表/分组屏的副表格（如 通知管理-发送记录），列与标题以 Figma 为准。 */
function SectionTable({ section }: { section: ScreenSection }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const statusMap = useMemo(
    () => ({ ...DEFAULT_STATUS_MAP, ...(section.statusMap ?? {}) }),
    [section.statusMap],
  );

  useEffect(() => {
    let cancelled = false;
    fetchResourceList(section.resource)
      .then((res) => {
        if (!cancelled) setRows(res.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) message.error(err instanceof Error ? err.message : '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [section.resource]);

  const columns: ColumnsType<Record<string, unknown>> = section.columns.map((col) => ({
    title: col.label,
    key: col.key,
    render: (_: unknown, row: Record<string, unknown>) => {
      if (col.kind === 'status') {
        const meta = statusMap[String(row[col.key] ?? '')];
        return meta ? <Tag color={meta.color}>{meta.label}</Tag> : String(row[col.key] ?? '-');
      }
      if (col.kind === 'datetime') return formatDate(row[col.key]);
      if (col.kind === 'relation' && col.relationLabel) {
        const val = getPath(row, col.relationLabel);
        return val == null || val === '' ? '-' : String(val);
      }
      const value = row[col.key];
      if (value == null || value === '') return '-';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    },
  }));

  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', marginTop: 16 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {section.title}
        </Typography.Title>
      </div>
      <Table
        rowKey={(r) => String(r.id)}
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={section.pagination ? { showTotal: (total) => `共 ${total} 条记录`, pageSize: 10 } : false}
      />
    </div>
  );
}

export function ResourceListPage({ config }: { config: ScreenConfig }) {
  if (config.template === 'form' && !config.columns?.length) {
    return <FormConfigPage config={config} />;
  }
  const stats = useStats();
  const resource = config.resource!;
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selects, setSelects] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [related, setRelated] = useState<Record<string, { value: string | number; label: string }[]>>({});
  const [deptOptions, setDeptOptions] = useState<{ value: string; label: string }[]>([]);
  const [form] = Form.useForm();
  const gate = isVisualGate();

  const statusMap = useMemo(() => ({ ...DEFAULT_STATUS_MAP, ...(config.statusMap ?? {}) }), [config.statusMap]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const frozen = LIST_GATE_ROWS[config.route];
      if (gate && frozen?.length) {
        setRows(frozen);
        return;
      }
      const res = await fetchResourceList(resource);
      setRows((res.data ?? []) as Record<string, unknown>[]);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [resource, gate, config.route]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!config.filters.some((f) => f.key === 'departmentId' && f.type === 'select')) return;
    if (gate) {
      setDeptOptions(LIST_GATE_DEPTS);
      return;
    }
    let cancelled = false;
    fetchResourceList('departments')
      .then((res) => {
        if (cancelled) return;
        setDeptOptions(
          (res.data ?? []).map((item) => {
            const rec = item as Record<string, unknown>;
            return { value: String(rec.id), label: String(rec.name ?? rec.id) };
          }),
        );
      })
      .catch(() => {
        if (!cancelled) setDeptOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [config.filters, gate]);

  const filtered = useMemo(() => {
    let list = rows;
    const kw = search.trim().toLowerCase();
    if (kw) {
      list = list.filter((row) => JSON.stringify(row).toLowerCase().includes(kw));
    }
    for (const [key, value] of Object.entries(selects)) {
      if (!value) continue;
      list = list.filter((row) => {
        if (key === 'departmentId') {
          const id =
            row.departmentId ??
            getPath(row, 'doctor.departmentId') ??
            getPath(row, 'doctor.department.id') ??
            getPath(row, 'department.id');
          return String(id ?? '') === value;
        }
        return String(row[key] ?? '') === value;
      });
    }
    return list;
  }, [rows, search, selects]);

  const loadRelated = async (fields: FormFieldConfig[]) => {
    const next: Record<string, { value: string | number; label: string }[]> = {};
    for (const field of fields) {
      if (!field.relatedResource || !field.relatedLabelKey) continue;
      try {
        const list = await fetchResourceList(field.relatedResource);
        next[field.key] = (list.data ?? []).map((item) => {
          const rec = item as Record<string, unknown>;
          const label = rec[field.relatedLabelKey!] ?? rec.name ?? rec.id;
          return { value: Number(rec.id), label: String(label) };
        });
      } catch {
        next[field.key] = [];
      }
    }
    // select 筛选项若带 relatedResource 也一并加载
    for (const filter of config.filters) {
      if (filter.type !== 'select' || !filter.options) continue;
      // 有 options 的 select 直接渲染，无需加载
    }
    setRelated(next);
  };

  const openCreate = async () => {
    setEditing(null);
    const initial: Record<string, unknown> = {};
    config.formFields.forEach((f) => {
      if (f.key === 'status') initial[f.key] = config.route === '/reviews' ? 'pending' : 'active';
      else if (f.key === 'sortOrder') initial[f.key] = 1;
      else if (f.type === 'boolean') initial[f.key] = false;
      else initial[f.key] = undefined;
    });
    form.setFieldsValue(initial);
    await loadRelated(config.formFields);
    setOpen(true);
  };

  const openEdit = async (row: Record<string, unknown>) => {
    setEditing(row);
    const initial: Record<string, unknown> = {};
    config.formFields.forEach((f) => {
      initial[f.key] = row[f.key];
    });
    form.setFieldsValue(initial);
    await loadRelated(config.formFields);
    setOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...values };
      for (const field of config.formFields) {
        if (field.type === 'password' && editing && !payload[field.key]) {
          delete payload[field.key];
        }
        if (field.relatedResource && payload[field.key] != null) {
          payload[field.key] = Number(payload[field.key]);
        }
      }
      if (editing?.id != null) await updateResource(resource, editing.id as number, payload);
      else await createResource(resource, payload);
      message.success('保存成功');
      setOpen(false);
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const actionsForRow = (row: Record<string, unknown>): string[] => {
    if (config.route === '/appointments') {
      const st = String(row.status ?? '');
      if (st === 'pending' || st === 'confirmed') return ['详情', '已就诊', '取消'];
      return ['详情'];
    }
    if (config.route === '/patients') {
      return String(row.status) === 'blacklisted' ? ['详情', '🔓 解禁'] : ['详情', '🔖 标签'];
    }
    if (config.route === '/orders') {
      return String(row.status) === 'paid' ? ['详情', '退款'] : ['详情'];
    }
    if (config.route === '/reviews') {
      const st = String(row.status ?? '');
      if (st === 'hidden') return ['💬 回复'];
      return ['💬 回复', '🙈 隐藏'];
    }
    return config.rowActions;
  };

  const handleDelete = (row: Record<string, unknown>) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条记录吗？此操作不可恢复。',
      okText: '确认删除',
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteResource(resource, row.id as number);
        message.success('已删除');
        await load();
      },
    });
  };

  const handleHideReview = (row: Record<string, unknown>) => {
    Modal.confirm({
      title: '隐藏评价',
      content: '隐藏后该评价将不再对前台展示。',
      okText: '确认隐藏',
      onOk: async () => {
        await updateResource(resource, row.id as number, { status: 'hidden' });
        message.success('已隐藏');
        await load();
      },
    });
  };

  const renderRowAction = (label: string, row: Record<string, unknown>) => {
    if (label === 'edit' || label === '编辑' || label === '修改') {
      return (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          style={{ color: '#fa8c16' }}
          onClick={() => void openEdit(row)}
        >
          {label === 'edit' ? '编辑' : label}
        </Button>
      );
    }
    if (label === 'delete' || label === '删除') {
      return (
        <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(row)}>
          删除
        </Button>
      );
    }
    if (label === '🙈 隐藏' || label === '隐藏') {
      return (
        <Button type="link" size="small" onClick={() => handleHideReview(row)}>
          {label}
        </Button>
      );
    }
    return (
      <Button
        type="link"
        size="small"
        danger={label === '取消'}
        style={
          label === '已就诊'
            ? { color: '#52c41a' }
            : label === '退款' || label === '🔓 解禁'
              ? { color: '#fa8c16' }
              : undefined
        }
        onClick={() => message.info(`「${label}」操作已按原型配置，交互待完善`)}
      >
        {label}
      </Button>
    );
  };

  const columns: ColumnsType<Record<string, unknown>> = [
    ...config.columns.map((col) => ({
      title: col.label,
      key: col.key,
      render: (_: unknown, row: Record<string, unknown>) => {
        if (col.kind === 'status') {
          const meta = statusMap[String(row[col.key] ?? '')];
          return meta ? <Tag color={meta.color}>{meta.label}</Tag> : String(row[col.key] ?? '-');
        }
        if (col.kind === 'datetime') return formatDate(row[col.key]);
        if (col.kind === 'boolean') return row[col.key] ? '是' : '否';
        if (col.key === 'rating') return renderStars(row[col.key]);
        if (col.key === 'tags') return renderTags(row[col.key]);
        if (col.key === 'amount' || col.key === 'fee') {
          return <span className="list-amount">{formatMoney(row[col.key], config.route === '/orders')}</span>;
        }
        if (col.key === 'phone' || col.key === 'patientPhone' || col.key.endsWith('Phone')) {
          return maskPhone(row[col.key]);
        }
        if (col.kind === 'relation' && col.relationLabel) {
          const val = getPath(row, col.relationLabel);
          const text = val == null || val === '' ? '-' : String(val);
          if (col.label === '科室' && text !== '-') {
            return <span className="doctor-dept-tag">{text}</span>;
          }
          return text;
        }
        if (col.label === '科室') {
          const val = row[col.key];
          const text = val == null || val === '' ? '-' : String(val);
          return text === '-' ? text : <span className="doctor-dept-tag">{text}</span>;
        }
        if (col.kind === 'title-desc') {
          return (
            <div>
              <div className="dept-name">{String(row[col.key] ?? '-')}</div>
              {col.descKey ? <div className="dept-desc">{String(row[col.descKey] ?? '')}</div> : null}
            </div>
          );
        }
        const value = row[col.key];
        if (value == null || value === '') return '-';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      },
    })),
    ...(config.rowActions.length
      ? [
          {
            title: '操作',
            key: 'actions',
            width: config.route === '/appointments' ? 200 : 160,
            render: (_: unknown, row: Record<string, unknown>) => (
              <Space size={0}>
                {actionsForRow(row).map((label) => (
                  <span key={label}>{renderRowAction(label, row)}</span>
                ))}
              </Space>
            ),
          },
        ]
      : []),
  ];

  const createAction = config.actions.find((a) => a.variant === 'primary');
  const createLabel = (createAction?.label ?? `新增${config.title}`).replace(/^[+＋]\s*/, '');
  const secondaryActions = config.actions.filter((a) => a !== createAction);

  const gateKpi = gate ? LIST_GATE_KPI[config.route] : undefined;
  const liveKpi = useMemo(
    () => deriveListKpi(config.route, rows, stats as unknown as Record<string, string | number>),
    [config.route, rows, stats],
  );
  const kpiItems = config.stats
    ? config.stats.map((s) => ({
        key: s.key,
        label: s.label,
        value: formatKpiValue(s.key, gateKpi?.[s.key] ?? liveKpi[s.key]),
      }))
    : null;

  const hasCardTitle = Boolean(config.cardTitle);

  const selectOptions = (f: (typeof config.filters)[number]) => {
    if (f.key === 'departmentId') {
      return (f.options?.length ? f.options : deptOptions).filter((o) => o.value !== '');
    }
    return (f.options ?? []).filter((o) => o.value !== '');
  };

  return (
    <div>
      <PageHeaderBlock title={config.title} subtitle={config.subtitle} />
      {kpiItems ? <KpiRow items={kpiItems} /> : null}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0' }}>
        <div
          className="list-toolbar"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: hasCardTitle ? 'flex-start' : 'center',
            gap: 12,
            padding: '16px 20px',
            borderBottom: '1px solid #f0f0f0',
            flexWrap: 'wrap',
          }}
        >
          {hasCardTitle ? (
            <div>
              <Typography.Title level={5} style={{ margin: 0 }}>
                {config.cardTitle}
              </Typography.Title>
              {config.cardSubtitle ? (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {config.cardSubtitle}
                </Typography.Text>
              ) : null}
            </div>
          ) : (
            <Space wrap>
              {config.filters
                .filter((f) => f.type === 'search' && f.key === 'search')
                .map((f) => (
                  <Input.Search
                    key={f.key}
                    allowClear
                    placeholder={f.placeholder}
                    style={{ width: 320 }}
                    onSearch={setSearch}
                    onChange={(e) => {
                      if (!e.target.value) setSearch('');
                    }}
                  />
                ))}
              {config.filters
                .filter((f) => f.type === 'select')
                .map((f) => (
                  <Select
                    key={f.key}
                    allowClear
                    placeholder={f.label}
                    style={{ width: 140 }}
                    value={selects[f.key] || undefined}
                    onChange={(v) => setSelects((prev) => ({ ...prev, [f.key]: v ?? '' }))}
                    options={selectOptions(f)}
                  />
                ))}
              {config.filters
                .filter((f) => f.key === 'month')
                .map((f) => (
                  <DatePicker
                    key={f.key}
                    picker="month"
                    allowClear
                    format="YYYY年MM月"
                    placeholder={f.label || f.placeholder}
                    defaultValue={gate ? dayjs('2026-08-01') : undefined}
                    style={{ width: 140 }}
                  />
                ))}
            </Space>
          )}
          <Space wrap>
            {hasCardTitle
              ? [
                  ...config.filters
                    .filter((f) => f.type === 'search' && f.key === 'search')
                    .map((f) => (
                      <Input.Search
                        key={f.key}
                        allowClear
                        placeholder={f.placeholder}
                        style={{ width: 280 }}
                        onSearch={setSearch}
                        onChange={(e) => {
                          if (!e.target.value) setSearch('');
                        }}
                      />
                    )),
                  ...config.filters
                    .filter((f) => f.type === 'select')
                    .map((f) => (
                      <Select
                        key={f.key}
                        allowClear
                        placeholder={f.label}
                        style={{ width: 140 }}
                        value={selects[f.key] || undefined}
                        onChange={(v) => setSelects((prev) => ({ ...prev, [f.key]: v ?? '' }))}
                        options={selectOptions(f)}
                      />
                    )),
                ]
              : null}
            {secondaryActions.map((action) => (
              <Button
                key={action.label}
                onClick={() => message.info(`「${action.label}」操作已按原型配置`)}
              >
                {action.label}
              </Button>
            ))}
            {config.readOnly || !createAction ? null : (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => void openCreate()}>
                {createLabel}
              </Button>
            )}
          </Space>
        </div>
        <Table
          rowKey={(r) => String(r.id)}
          loading={loading}
          columns={columns}
          dataSource={filtered}
          pagination={
            config.pagination
              ? {
                  showSizeChanger: false,
                  pageSize: 10,
                  showTotal: (total) => {
                    if (config.route === '/orders') {
                      const sum = filtered.reduce((acc, row) => acc + Number(row.amount ?? 0), 0);
                      return `共 ${total} 条，合计 ¥${sum.toFixed(2)}`;
                    }
                    return `共 ${total} 条记录`;
                  },
                }
              : false
          }
        />
      </div>

      {config.sections?.map((section) => (
        <SectionTable key={section.title} section={section} />
      ))}

      <Modal
        title={editing ? `编辑${config.title.replace(/管理$/, '')}` : createLabel}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void handleSubmit()}
        confirmLoading={saving}
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} style={{ marginTop: 16 }}>
          {config.formFields.map((field) => {
            if (field.type === 'textarea') {
              return (
                <Form.Item
                  key={field.key}
                  name={field.key}
                  label={field.label}
                  rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : undefined}
                >
                  <TextArea rows={3} />
                </Form.Item>
              );
            }
            if (field.type === 'select' || field.relatedResource) {
              return (
                <Form.Item
                  key={field.key}
                  name={field.key}
                  label={field.label}
                  rules={field.required ? [{ required: true, message: `请选择${field.label}` }] : undefined}
                >
                  <Select
                    options={
                      field.relatedResource
                        ? related[field.key]
                        : field.options?.map((o) => ({ value: o.value, label: o.label }))
                    }
                    placeholder={`请选择${field.label}`}
                  />
                </Form.Item>
              );
            }
            if (field.type === 'number') {
              return (
                <Form.Item key={field.key} name={field.key} label={field.label} extra={field.hint}>
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              );
            }
            if (field.type === 'boolean') {
              return (
                <Form.Item key={field.key} name={field.key} label={field.label} valuePropName="checked">
                  <Switch />
                </Form.Item>
              );
            }
            return (
              <Form.Item
                key={field.key}
                name={field.key}
                label={field.label}
                rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : undefined}
              >
                <Input type={field.type === 'password' ? 'password' : field.type === 'date' ? 'date' : 'text'} />
              </Form.Item>
            );
          })}
        </Form>
      </Modal>
    </div>
  );
}
