import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createResource,
  deleteResource,
  fetchResourceList,
  updateResource,
} from '../api/client';
import { KpiRow, PageHeaderBlock } from '../components/chrome/PageBlocks';
import { useStats } from '../components/chrome/StatsContext';
import { isVisualGate } from '../visual/gate';
import doctorsBlueprint from '../blueprints/doctors.json';

const { TextArea } = Input;

interface DeptOption {
  id: number;
  name: string;
}

interface DoctorRow {
  id: number;
  name: string;
  title?: string | null;
  departmentId?: number;
  department?: { id: number; name: string } | null;
  specialty?: string | null;
  experienceYears?: number | null;
  goodRate?: number | null;
  fee?: number | null;
  status?: string;
  avatar?: string | null;
}

const AVATAR_TONE: Record<string, { bg: string; color: string }> = {
  张: { bg: '#E6F7FF', color: '#1890FF' },
  李: { bg: '#FFF7E6', color: '#FA8C16' },
  王: { bg: '#E6FFFB', color: '#13C2C2' },
  陈: { bg: '#F9F0FF', color: '#722ED1' },
  赵: { bg: '#F6FFED', color: '#52C41A' },
  刘: { bg: '#FFF0F6', color: '#EB2F96' },
  周: { bg: '#FFF7E6', color: '#FA8C16' },
  孙: { bg: '#E6F4FF', color: '#1677FF' },
  吴: { bg: '#FFF1F0', color: '#F5222D' },
  郑: { bg: '#F6FFED', color: '#389E0D' },
  黄: { bg: '#FFFBE6', color: '#D48806' },
};

function avatarTone(name: string) {
  return AVATAR_TONE[name.slice(0, 1)] ?? { bg: '#F5F5F5', color: '#595959' };
}

function fileListToAvatar(fileList: unknown): string | undefined {
  if (!Array.isArray(fileList) || fileList.length === 0) return undefined;
  const item = fileList[0] as { url?: string; thumbUrl?: string; name?: string; originFileObj?: File };
  if (item.url) return item.url;
  if (item.thumbUrl) return item.thumbUrl;
  if (item.originFileObj?.name) return item.originFileObj.name;
  return item.name;
}

export function DoctorsPage() {
  const bp = doctorsBlueprint;
  const gate = isVisualGate();
  const stats = useStats();
  const [rows, setRows] = useState<DoctorRow[]>([]);
  const [depts, setDepts] = useState<DeptOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<number | undefined>();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<DoctorRow | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [docRes, deptRes] = await Promise.all([
        fetchResourceList<DoctorRow>('doctors'),
        fetchResourceList<DeptOption>('departments'),
      ]);
      const data = (docRes.data ?? []) as DoctorRow[];
      setRows(gate && bp.sample?.rows?.length ? (bp.sample.rows as DoctorRow[]) : data);
      setDepts((deptRes.data ?? []) as DeptOption[]);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [gate, bp.sample?.rows]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpiItems = useMemo(
    () =>
      bp.kpiRow.map((k) => ({
        key: k.key,
        label: k.label,
        value: gate
          ? ((bp.sample as { kpi?: Record<string, number> } | undefined)?.kpi?.[k.key] ??
              (stats as unknown as Record<string, number>)[k.key] ??
              0)
          : ((stats as unknown as Record<string, number>)[k.key] ?? 0),
      })),
    [bp.kpiRow, bp.sample, gate, stats],
  );

  const filtered = useMemo(() => {
    let list = rows;
    const kw = search.trim().toLowerCase();
    if (kw) {
      list = list.filter((row) => {
        const hay = [row.name, row.title, row.specialty, row.department?.name]
          .map((v) => String(v ?? '').toLowerCase())
          .join(' ');
        return hay.includes(kw);
      });
    }
    if (deptFilter != null) {
      list = list.filter((row) => row.departmentId === deptFilter || row.department?.id === deptFilter);
    }
    return list;
  }, [rows, search, deptFilter]);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({
      avatar: undefined,
      name: undefined,
      title: undefined,
      departmentId: undefined,
      fee: undefined,
      experienceYears: undefined,
      goodRate: undefined,
      specialty: undefined,
      status: 'active',
    });
    setOpen(true);
  };

  const openEdit = (row: DoctorRow) => {
    setEditing(row);
    form.setFieldsValue({
      avatar: row.avatar ? [{ uid: '-1', name: 'avatar', url: row.avatar, status: 'done' }] : undefined,
      name: row.name,
      title: row.title ?? undefined,
      departmentId: row.departmentId ?? row.department?.id,
      fee: row.fee ?? undefined,
      experienceYears: row.experienceYears ?? undefined,
      goodRate: row.goodRate ?? undefined,
      specialty: row.specialty ?? undefined,
      status: row.status ?? 'active',
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload = {
        ...values,
        avatar: fileListToAvatar(values.avatar),
        departmentId: Number(values.departmentId),
        fee: values.fee != null ? Number(values.fee) : undefined,
        experienceYears: values.experienceYears != null ? Number(values.experienceYears) : undefined,
        goodRate: values.goodRate != null ? Number(values.goodRate) : undefined,
      };
      if (editing) {
        await updateResource('doctors', editing.id, payload);
      } else {
        await createResource('doctors', payload);
      }
      message.success('保存成功');
      setOpen(false);
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row: DoctorRow) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定删除医生「${row.name}」吗？此操作不可恢复。`,
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await deleteResource('doctors', row.id);
        message.success('已删除');
        await load();
      },
    });
  };

  const columns: ColumnsType<DoctorRow> = [
    {
      title: '医生',
      key: 'doctor',
      render: (_, row) => {
        const tone = avatarTone(row.name);
        return (
          <div className="doctor-cell">
            {row.avatar ? (
              <img src={row.avatar} alt="" className="doctor-avatar-img" width={36} height={36} />
            ) : (
              <div className="doctor-avatar" style={{ background: tone.bg, color: tone.color }}>
                {row.name.slice(0, 1)}
              </div>
            )}
            <div>
              <div className="doctor-name">{row.name}</div>
              <div className="doctor-title">{row.title || '-'}</div>
            </div>
          </div>
        );
      },
    },
    {
      title: '科室',
      key: 'department',
      width: 100,
      render: (_, row) => {
        const name = row.department?.name;
        return name ? <span className="doctor-dept-tag">{name}</span> : '-';
      },
    },
    {
      title: '擅长',
      key: 'specialty',
      render: (_, row) => (
        <div className="doctor-specialty" title={row.specialty ?? undefined}>
          {row.specialty || '-'}
        </div>
      ),
    },
    {
      title: '经验/好评',
      key: 'experience',
      width: 120,
      render: (_, row) => {
        const years = row.experienceYears;
        const rate = row.goodRate;
        if (years == null && rate == null) return '-';
        return `${years ?? '-'}年 / ${rate ?? '-'}%`;
      },
    },
    {
      title: '挂号费',
      key: 'fee',
      width: 90,
      render: (_, row) => <span className="doctor-fee">{row.fee != null ? `¥${row.fee}` : '-'}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: string) =>
        status === 'active' ? <Tag color="success">在诊</Tag> : <Tag>停诊</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_, row) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            style={{ color: '#fa8c16' }}
            onClick={() => openEdit(row)}
          >
            编辑
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(row)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeaderBlock title={bp.pageHeader.title} subtitle={bp.pageHeader.subtitle} />
      <KpiRow items={kpiItems} />
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            padding: '16px 20px',
            borderBottom: '1px solid #f0f0f0',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {bp.listCard.title}
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {bp.listCard.subtitle}
            </Typography.Text>
          </div>
          <Space wrap>
            <Input.Search
              allowClear
              placeholder={bp.listCard.searchPlaceholder}
              style={{ width: 220 }}
              onSearch={setSearch}
              onChange={(e) => {
                if (!e.target.value) setSearch('');
              }}
            />
            <Select
              allowClear
              placeholder={bp.listCard.departmentFilter}
              style={{ width: 120 }}
              value={deptFilter}
              onChange={(v) => setDeptFilter(v)}
              options={depts.map((d) => ({ value: d.id, label: d.name }))}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增医生
            </Button>
          </Space>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={filtered}
          pagination={{
            showTotal: (total) => `共 ${total} 条记录`,
            pageSize: 10,
            showSizeChanger: false,
          }}
        />
      </div>

      <Modal
        title={editing ? '编辑医生' : bp.modal.title}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void handleSubmit()}
        confirmLoading={saving}
        okText="确定"
        cancelText="取消"
        width={520}
        centered
        destroyOnClose
        className="doctor-modal"
        classNames={{ container: 'doctor-modal-content' }}
        styles={{
          container: { width: 520, height: 717, maxHeight: 717, padding: 0, overflow: 'hidden' },
          body: { padding: '16px 20px 0', overflow: 'auto' },
          header: { margin: 0 },
          footer: { margin: 0 },
        }}
      >
        <Form
          form={form}
          layout="horizontal"
          labelCol={{ flex: '100px' }}
          wrapperCol={{ flex: 1 }}
          labelAlign="right"
          colon={false}
          requiredMark={(label, info) =>
            info.required ? (
              <>
                {label}
                <span style={{ color: '#ff4d4f', marginLeft: 4 }}>*</span>
              </>
            ) : (
              label
            )
          }
        >
          <Form.Item label="医生头像">
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Form.Item
                name="avatar"
                valuePropName="fileList"
                getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                noStyle
              >
                <Upload listType="picture-card" maxCount={1} beforeUpload={() => false}>
                  <div>
                    <div className="dept-upload-plus">＋</div>
                    <div className="dept-upload-text">上传头像</div>
                  </div>
                </Upload>
              </Form.Item>
              <div style={{ color: '#8c8c8c', fontSize: 12, lineHeight: '20px', paddingTop: 0 }}>
                <div>建议尺寸 200×200px</div>
                <div>支持 JPG、PNG，最大 2MB</div>
              </div>
            </div>
          </Form.Item>
          <Form.Item name="name" label="医生姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="title" label="职称" rules={[{ required: true, message: '请输入职称' }]}>
            <Input placeholder="请输入职称" />
          </Form.Item>
          <Form.Item name="departmentId" label="所属科室" rules={[{ required: true, message: '请选择所属科室' }]}>
            <Select
              placeholder="请选择所属科室"
              options={depts.map((d) => ({ value: d.id, label: d.name }))}
            />
          </Form.Item>
          <Form.Item name="fee" label="挂号费(¥)" rules={[{ required: true, message: '请输入挂号费' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="experienceYears" label="从业年限">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="goodRate" label="好评率(%)">
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="specialty" label="擅长领域">
            <TextArea rows={2} placeholder="逗号分隔" />
          </Form.Item>
          <Form.Item name="status" label="状态" style={{ marginBottom: 0 }}>
            <Select
              options={[
                { value: 'active', label: '在诊' },
                { value: 'inactive', label: '停诊' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
