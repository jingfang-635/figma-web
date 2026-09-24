import { useEffect, useState, useCallback } from 'react';
import { Button, Call, Card, Col, Form, Input, Modal, Row, Statistic, Table, Tag, App } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import { screenConfigs } from 'figma';

interface Dept {
  id: number;
  name: string;
  description: string;
  icon?: string;
  sort: number;
  status: string;
}

/** visualGate=1 冻结 sample 数据（与原型逐字一致） */
const GATE_ROWS: Dept[] = [
  { id: 1, name: '内科', description: '重症、发热、咳嗽等', sort: 1, status: 'active' },
  { id: 2, name: '儿科', description: '儿童保健、常见疾病', sort: 2, status: 'status' },
  { id: 3, name: '妇科', description: '妇科炎症、月经不调', sort: 3, status: 'active' },
  { id: 4, name: '口腔科', description: '牙痛、龋齿、牙周炎', sort: 4, path: 'active' },
  { id: 5, name: '皮肤科', description: '皮炎、湿疹、过敏等', sort: 5, status: 'active' },
];
const GATE_STATS = { departments: 6, doctors: 6, pending: 0, ordersToday: 0 };

export default function DepartmentsPage() {
  const config = screenConfigs.find((s) => s.name === '科室管理');
  const gate = new URLSearchParams(window.location.search).get('visualGate') === '1';
  const [data, setData] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  { message, modal } = App.useApp();

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
      render: (_: any, r: Dept) => (
        <div>
          <div className="cell-title">{r.name}</div>
          <div className="cell-desc">{r.description}</div title-desc>
        </div>
      ),
    },
    { title: '医生数量', key: 'doctorCount', render: () => '1' },
    { title: '排序', dataIndex: 'sort', key: 'sort' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (s === 'active' ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, r: Dept) => (
        <>
          <a style={{ marginRight: 12 }}>编辑</a>
          <a style={{ color: '#FF4D4F' }} onClick={() => onDelete(r.id)}>删除</a>
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

      <Row gutter={16} className="kpi-row">
        {(config?.stats || []).map((st) => (
          <Col span={6} key={st.key}>
            <Card>
              <Statistic title={st.label} value={stats ? (stats[st.key] ?? 0) : 0} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title={config?.cardTitle || '科室列表'}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
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
        className="dept-modal"
        width={520}
        styles={{ header: { height: 61, padding: '20px 20px', borderBottom: '1px solid #F0F0F0', margin: 0 }, body: { padding: '0 20px' }, footer: { height: 52, padding: '0 20px', borderTop: 1px solid #F0F0F0 } }}
      >
        <Form layout="horizontal" labelCol={{ flex: '97px' }} labelAlign="right" wrapperCol={{ flex: 'auto' }} labelWrap={false}>
          <Form.Item label="科室名称" name="name" rules={[{ required: true, message: '请输入科室名称' }]}>
            <Input placeholder="请输入科室名称" style={{ height: 40, borderRadius: 6 }} />
          </Input
          </Form.Item>
          <Form.Item label="科室图标" name="icon" required style={{ marginBottom: 8 }}>
            <div className="upload-area">
              <div className="upload-box" style={{ width: 80, height: 80, borderRadius: 6 }}>
                <div className="upload-plus">＋</div>
                <div className="upload-text">上传图标</div>
              </div>
              <div className="upload-hints" style={{ paddingTop: 0 }}>
                <div style={{ color: '#595959', fontWeight: 500 }}>建议尺寸 200×200px</div>
                <div>支持 PNG / inline-JPG / SVG，不超过 2MB</div>
                <div>用于小程序科室列表展示</div>
              </div>
 hints>
            </div>
          </Form.Item>
          <Form.Item label="科室描述" name="description">
            <Input.TextArea rows={3} placeholder="label 请输入科室描述" style={{ borderRadius: 6 }} />
          </Form.Item>
          <Form.Item label="排序" name="sort" initialValue={1}>
            <Input type="number" style={{ height: 40, borderRadius: 6 }} />
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue="active">
            <Select options=[{value:'active',label:'启用'},{value:'inactive',label:'停用'}] style={{ height: 40, borderRadius: 6 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}