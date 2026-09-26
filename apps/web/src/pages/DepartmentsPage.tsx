import { useEffect, useState, useCallback } from 'react';
import { Button, Card, Form, Input, Modal, Select, Table, Tag, App } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import { screenConfigs } from '../generated/screenConfigs';

interface Dept {
  id: number;
  name: string;
  description: string;
  icon?: string;
  sort: number;
  status: string;
  /** 后端 /departments 实时统计的该科室医生数（派生列） */
  doctorCount: number;
}

/** visualGate=1 冻结 sample 数据（与原型逐字一致） */
const GATE_ROWS: Dept[] = [
  { id: 1, name: '内科', description: '重症、发热、咳嗽等', sort: 1, status: 'active', doctorCount: 2 },
  { id: 2, name: '儿科', description: '儿童保健、常见疾病', sort: 2, status: 'active', doctorCount: 10 },
  { id: 3, name: '妇科', description: '妇科炎症、月经不调', sort: 3, status: 'active', doctorCount: 6 },
  { id: 4, name: '口腔科', description: '牙痛、龋齿、牙周炎', sort: 4, status: 'active', doctorCount: 1 },
  { id: 5, name: '皮肤科', description: '皮炎、湿疹、过敏等', sort: 5, status: 'active', doctorCount: 1 },
];
const GATE_STATS = { departments: 6, doctors: 6, pending: 0, ordersToday: 0 };

/** 科室图标圆底色（逐科室不同，取 layout-ir/departments.json 中各图标圆的 fill；形状 36×36 正圆） */
const DEPT_ICON_BG: Record<string, string> = {
  内科: '#EBF5FF',
  儿科: '#FFF0F5',
  妇科: '#FFF0F5',
  口腔科: '#E8FFF3',
  皮肤科: '#F0E6FF',
};

export default function DepartmentsPage() {
  const config = screenConfigs.find((s) => s.name === '科室管理');
  const gate = new URLSearchParams(window.location.search).get('visualGate') === '1';
  const [data, setData] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const { message, modal } = App.useApp();
  const [stats, setStats] = useState<Record<string, any> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await api<Dept[]>('/departments').catch(() => []);
    setData(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (gate) {
      setData(GATE_ROWS);
      setStats(GATE_STATS);
      return;
    }
    load();
    api<Record<string, any>>('/dashboard/stats').then(setStats).catch(() => {});
  }, [gate, load]);

  const onSave = async (values: Record<string, any>) => {
    await api('/departments', { method: 'POST', body: JSON.stringify({ ...values, status: 'active' }) });
    message.success('新增成功');
    setModalOpen(false);
    form.resetFields();
    load();
  };

  const onDelete = (id: number) => {
    modal.confirm({
      title: '确认删除',
      content: '确定要删除此科室吗？',
      okText: '确认删除',
      cancelText: '取消',
      onOk: async () => {
        await api(`/departments/${id}`, { method: 'DELETE' });
        message.success('已删除');
        load();
      },
    });
  };

  const columns = [
    {
      title: '科室',
      key: 'name',
      width: 399,
      render: (_: any, r: Dept) => (
        <div className="cell-name">
          <span className="cell-icon" style={{ background: DEPT_ICON_BG[r.name] }}>
            <img src={`/assets/nav/${r.name}.png`} alt="" />
          </span>
          <span>
            <div className="cell-title">{r.name}</div>
            <div className="cell-desc">{r.description}</div>
          </span>
        </div>
      ),
    },
    {
      title: '医生数量',
      key: 'doctorCount',
      width: 155,
      className: 'col-doctor-count',
      render: (_: any, r: Dept) => <span className="cell-text">{r.doctorCount}</span>,
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 103,
      className: 'col-sort',
      render: (v: number) => <span className="cell-text">{v}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 142,
      className: 'col-status',
      render: (s: string) => (s === 'active' ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>),
    },
    {
      title: '操作',
      key: 'actions',
      width: 333,
      className: 'col-actions',
      render: (_: any, r: Dept) => (
        <>
          <a className="cell-op">编辑</a>
          <a className="cell-op-del" onClick={() => onDelete(r.id)}>删除</a>
        </>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">{config?.title || '科室管理'}</div>
          <div className="page-subtitle">{config?.subtitle}</div>
        </div>
      </div>

      <div className="kpi-strip">
        {(config?.stats || []).map((st) => (
          <div className="kpi-card" key={st.key}>
            <div className="kpi-label">{st.label}</div>
            <div className="kpi-value">{stats ? (stats[st.key] ?? 0) : 0}</div>
          </div>
        ))}
      </div>

      <Card
        className="list-card"
        title={
          <>
            <div className="card-title-main">{config?.cardTitle || '科室列表'}</div>
            <div className="card-title-sub">维护小程序展示的科室名称、说明和图标</div>
          </>
        }
        extra={
          <Button type="primary" onClick={() => setModalOpen(true)}>
            新增科室
          </Button>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          columns={columns}
          pagination={{ total: data.length, pageSize: 10, showTotal: (t) => `共 ${t} 条记录` }}
        />
      </Card>

      <Modal
        title="新增科室"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        okText="确定"
        cancelText="取消"
        onOk={() => form.submit()}
        width={520}
        className="dept-modal"
      >
        <Form layout="horizontal" labelCol={{ flex: '100px' }} labelAlign="right" wrapperCol={{ flex: 'auto' }} colon={false}>
          <Form.Item label="科室名称" name="name" rules={[{ required: true, message: '请输入科室名称' }]} style={{ marginBottom: 16 }}>
            <Input placeholder="请输入科室名称" style={{ height: 40, borderRadius: 6 }} />
          </Form.Item>
          <Form.Item label="科室图标" name="icon" required>
            <div className="upload-area">
              <div className="upload-box" style={{ width: 80, height: 80, borderRadius: 6 }}>
                <PlusOutlined className="upload-plus" />
                <div className="upload-text">上传图标</div>
              </div>
              <div className="upload-hints">
                <div style={{ color: '#595959', fontWeight: 500 }}>建议尺寸 200×200px</div>
                <div>支持 PNG / JPG / SVG，不超过 2MB</div>
                <div>用于小程序科室列表展示</div>
              </div>
            </div>
          </Form.Item>
          <Form.Item label="科室描述" name="description">
            <Input.TextArea rows={3} placeholder="请输入科室描述" style={{ borderRadius: 6 }} />
          </Form.Item>
          <Form.Item label="排序" name="sort" initialValue={1}>
            <Input type="number" style={{ height: 40, borderRadius: 6 }} />
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue="active">
            {/* IR 365 行有下拉箭头（icon 节点）→ 是 Select，不是只读 Input */}
            <Select options={[{ value: 'active', label: '启用' }, { value: 'inactive', label: '停用' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
