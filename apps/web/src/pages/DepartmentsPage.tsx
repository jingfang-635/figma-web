import { useEffect, useState, useCallback } from 'react';
import { Button, Card, Col, Form, Input, Modal, Row, Statistic, Switch, Table, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../api/client';

interface Dept {
  id: number;
  name: string;
  description: string;
  icon?: string;
  sort: number;
  status: string;
}

export default function DepartmentsPage() {
  const [data, setData] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [stats, setStats] = useState<Record<string, any> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api<Dept[]>('/departments');
      setData(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    api<Record<string, any>>('/dashboard/stats').then(setStats).catch(() => {});
  }, [load]);

  const onSave = async (values: Record<string, any>) => {
    await api('/departments', { method: 'POST', body: JSON.stringify({ ...values, status: 'active' }) });
    message.success('新增成功');
    setModalOpen(false);
    form.resetFields();
    load();
  };

  const onDelete = async (id: number) => {
    Modal.confirm({
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
    { title: '科室', dataIndex: 'name', key: 'name' },
    { title: '医生数量', key: 'doctorCount', render: (_: any, r: Dept) => '1' },
    { title: '排序', dataIndex: 'sort', key: 'sort' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => (s === 'active' ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>),
    },
    {
      title: '操作', key: 'actions',
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
          <div className="page-title">科室管理</div>
          <div className="page-subtitle">管理门诊基础资料、排班与预约信息</div>
        </div>
      </div>

      <Row gutter={16} className="kpi-row">
        <Col span={6}><Card><Statistic title="启用科室" value={stats?.activeDepartments ?? 5} /></Card></Col>
        <Col span={6}><Card><Statistic title="在诊医生" value={stats?.activeDoctors ?? 4} /></Card></Col>
        <Col span={6}><Card><Statistic title="待就诊" value={stats?.pending ?? 3} /></Card></Col>
        <Col span={6}><Card><Statistic title="今日订单" value={stats?.todayOrders ?? 3} /></Card></Col>
      </Row>

      <Card
        title="科室列表"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>新增科室</Button>
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
      >
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item label="科室名称" name="name" rules={[{ required: true, message: '请输入科室名称' }]}>
            <Input placeholder="请输入科室名称" />
          </Form.Item>
          <Form.Item label="科室图标" name="icon">
            <Input placeholder="上传图标（建议尺寸 200×200px）" />
          </Form.Item>
          <Form.Item label="科室描述" name="description">
            <Input.TextArea rows={3} placeholder="请输入科室描述" />
          </Form.Item>
          <Form.Item label="排序" name="sort" initialValue={1}>
            <Input type="number" />
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue="启用">
            <Switch checkedChildren="启用" unCheckedChildren="停用" defaultChecked />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}