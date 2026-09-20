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
import { getDeptVisual } from '../config/navIcons';
import { isVisualGate } from '../visual/gate';
import departmentsBlueprint from '../blueprints/departments.json';

const { TextArea } = Input;

interface DeptRow {
  id: number;
  name: string;
  code?: string;
  icon?: string | null;
  description?: string | null;
  sortOrder?: number;
  status?: string;
  _count?: { doctors: number };
}

function fileListToIcon(fileList: unknown): string | undefined {
  if (!Array.isArray(fileList) || fileList.length === 0) return undefined;
  const item = fileList[0] as { url?: string; thumbUrl?: string; name?: string; originFileObj?: File };
  if (item.url) return item.url;
  if (item.thumbUrl) return item.thumbUrl;
  if (item.originFileObj?.name) return item.originFileObj.name;
  return item.name;
}

export function DepartmentsPage() {
  const bp = departmentsBlueprint;
  const gate = isVisualGate();
  const stats = useStats();
  const [rows, setRows] = useState<DeptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<DeptRow | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchResourceList<DeptRow>('departments');
      const data = (res.data ?? []) as DeptRow[];
      setRows(gate && bp.sample?.rows?.length ? (bp.sample.rows as DeptRow[]) : data);
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

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({ name: '', icon: undefined, description: '', sortOrder: 1, status: 'active' });
    setOpen(true);
  };

  const openEdit = (row: DeptRow) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      icon: row.icon ?? undefined,
      description: row.description ?? '',
      sortOrder: row.sortOrder ?? 1,
      status: row.status ?? 'active',
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload = { ...values, icon: fileListToIcon(values.icon) };
      if (editing) {
        await updateResource('departments', editing.id, payload);
      } else {
        await createResource('departments', payload);
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

  const handleDelete = (row: DeptRow) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定删除科室「${row.name}」吗？此操作不可恢复。`,
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await deleteResource('departments', row.id);
        message.success('已删除');
        await load();
      },
    });
  };

  const columns: ColumnsType<DeptRow> = [
    {
      title: '科室',
      key: 'dept',
      render: (_, row) => {
        const visual = getDeptVisual(row.name);
        const DeptGlyph = visual.icon;
        return (
          <div className="dept-cell">
            {visual.src ? (
              <img src={visual.src} alt="" className="dept-icon" width={40} height={40} />
            ) : (
              <div className="dept-icon-fallback" style={{ background: visual.bg }}>
                <DeptGlyph style={{ fontSize: 20, color: '#595959' }} />
              </div>
            )}
            <div>
              <div className="dept-name">{row.name}</div>
              <div className="dept-desc">{row.description || '-'}</div>
            </div>
          </div>
        );
      },
    },
    {
      title: '医生数量',
      key: 'doctorCount',
      width: 100,
      render: (_, row) => row._count?.doctors ?? 0,
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) =>
        status === 'active' ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>,
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
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(row)}
          >
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
            padding: '16px 20px',
            borderBottom: '1px solid #f0f0f0',
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
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增科室
          </Button>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{
            showTotal: (total) => `共 ${total} 条记录`,
            pageSize: 10,
          }}
        />
      </div>

      <Modal
        title={editing ? '编辑科室' : bp.modal.title}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void handleSubmit()}
        confirmLoading={saving}
        okText="确定"
        cancelText="取消"
        width={520}
        centered
        destroyOnClose
        className="dept-modal"
        styles={{
          body: { padding: "16px 20px 0", overflow: "hidden" },
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
          <Form.Item name="name" label="科室名称" rules={[{ required: true, message: '请输入科室名称' }]}>
            <Input placeholder="请输入科室名称" />
          </Form.Item>
          <Form.Item label="科室图标" required>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Form.Item
                name="icon"
                valuePropName="fileList"
                getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                rules={[{ required: true, message: '请上传科室图标' }]}
                noStyle
              >
                <Upload listType="picture-card" maxCount={1} beforeUpload={() => false}>
                  <div>
                    <div className="dept-upload-plus">＋</div>
                    <div className="dept-upload-text">上传图标</div>
                  </div>
                </Upload>
              </Form.Item>
              <div style={{ color: '#8c8c8c', fontSize: 12, lineHeight: '20px', paddingTop: 0 }}>
                <div>建议尺寸 200×200px</div>
                <div>支持 PNG / JPG / SVG，不超过 2MB</div>
                <div>用于小程序科室列表展示</div>
              </div>
            </div>
          </Form.Item>
          <Form.Item name="description" label="科室描述">
            <TextArea rows={2} placeholder="请输入科室描述" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态" style={{ marginBottom: 0 }}>
            <Select
              options={[
                { value: 'active', label: '启用' },
                { value: 'inactive', label: '停用' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
