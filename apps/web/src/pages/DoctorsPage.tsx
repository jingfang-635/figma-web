import { useEffect, useState, useCallback } from 'react';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Statistic, Table, Tag, App } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import { screenConfigs } from '../generated/screenConfigs';

interface Doctor {
  id: number;
  name: string;
  title: string;
  deptId: string;
  specialty: string;
  years: number;
  goodRate: number;
  fee: number;
  status: string;
}

/** visualGate=1 冻结 sample 数据（与原型逐字一致） */
const GATE_ROWS: Doctor[] = [
  { id: 1, name: '张伟', title: '副主任医师', deptId: '1', specialty: '高血压、糖尿病、冠心病等慢性病...', years: 15, goodRate: 99, fee: 30, status: 'active' },
  { id: 2, name: '李娜', title: '主任医师 副教授', deptId: '3', specialty: '妇科炎症、月经不调、宫颈疾病、...', years: 16, goodRate: 99, fee: 30, status: 'active' },
  { id: 3, name: '王磊', title: '主治医师', deptId: '2', specialty: '儿童感冒、咳嗽、发热等常见病', years: 10, goodRate: 98, fee: 25, status: 'active' },
  { id: 4, name: '王磊', title: '主治医师', deptId: '4', specialty: '牙体牙髓、牙周疾病', years: 9, goodRate: 98, fee: 35, status: 'active' },
];
const GATE_STATS = { departments: 6, doctors: 6, pending: 0, ordersToday: 0 };

export default function DoctorsPage() {
  const config = screenConfigs.find((s) => s.name === '医生管理');
  const gate = new URLSearchParams(window.location.search).get('visualGate') === '1';
  const [data, setData] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [stats, setStats] = useState<Record<string, any> | null>(null);
  const { message } = App.useApp();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api<Doctor[]>('/doctors');
      setData(list);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
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
    await api('/doctors', { method: 'POST', body: JSON.stringify({ ...values, status: 'active' }) });
    message.success('新增成功');
    setModalOpen(false);
    form.resetFields();
    load();
  };

  const columns = [
    {
      title: '医生',
      key: 'name',
      render: (_: any, r: Doctor) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="cell-avatar">{String(r.name || '').charAt(0)}</span>
          <span className="cell-title">{r.name}</span>
        </div>
      ),
    },
    {
      title: '科室',
      key: 'deptName',
      render: (_: any, r: Doctor) => ({ '1': '内科', '2': '儿科', '3': '妇科', '4': '口腔科', '5': '皮肤科' }[r.deptId] || ''),
    },
    { title: '擅长', dataIndex: 'specialty', key: 'specialty', ellipsis: true },
    {
      title: '经验/好评',
      key: 'experience',
      render: (_: any, r: Doctor) => `${r.years || 0}年 / ${r.goodRate || 0}%`,
    },
    { title: '挂号费', key: 'fee', render: (_: any, r: Doctor) => `¥${r.fee ?? ''}` },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (s === 'active' ? <Tag color="success">在诊</Tag> : <Tag>停诊</Tag>),
    },
    {
      title: '操作',
      key: 'actions',
      render: () => (
        <>
          <a style={{ marginRight: 12 }}>编辑</a>
          <a style={{ color: '#FF4D4F' }}>删除</a>
        </>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">{config?.title || '医生管理'}</div>
          <div className="page-subtitle">{config?.subtitle}</div>
        </div>
      </div>

      <Row gutter={16} className="kpi-row">
        {(config?.stats || []).map((st) => (
          <Col span={6} key={st.key}>
            <Card><Statistic title={st.label} value={stats ? (stats[st.key] ?? 0) : 0} /></Card>
          </Col>
        ))}
      </Row>

      <Card title={config?.cardTitle || '医生列表'}>
        <div className="list-toolbar">
          <Space>
            <Input.Search placeholder="搜索医生、科室或擅长" style={{ width: 240 }} />
            <Select placeholder="全部科室" style={{ width: 140 }} options={[]} />
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            新增医生
          </Button>
      </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          columns={columns}
          pagination={{ total: data.length, pageSize: 10, showTotal: (t) => `共 ${t} 条记录` }}
        />
      </Card>

      <Modal
        title="新增医生"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        okText="确定"
        cancelText="取消"
        onOk={() => form.submit()}
        className="doctor-modal"
      >
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item label="医生头像" name="avatar">
            <div className="upload-area">
              <div className="upload-box">
                <div className="upload-plus">＋</div>
                <div className="upload-text">上传头像</div>
              </div>
              <div className="upload-hints">
                <div>建议尺寸 200×200px</div>
                <div>支持 JPG、PNG，最大 2MB</div>
              </div>
            </div>
          </Form.Item>
          <Form.Item label="医生姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item label="职称" name="title" rules={[{ required: true, message: '请选择职称' }]} initialValue="主任医师">
            <Select options={[{ value: '主任医师', label: '主任医师' }]} />
          </Form.Item>
          <Form.Item label="所属科室" name="deptId" rules={[{ required: true, message: '请选择所属科室' }]}>
            <Select placeholder="内科" options={[]} />
          </Form.Item>
          <Form.Item label="挂号费(¥)" name="fee" rules={[{ required: true, message: '请输入挂号费' }]} initialValue={30}>
            <Input type="number" />
          </Form.Item>
          <Form.Item label="从业年限" name="years" initialValue={10}>
            <Input type="number" />
          </Form.Item>
          <Form.Item label="好评率(%)" name="goodRate" initialValue={98}>
            <Input type="number" />
          </Form.Item>
          <Form.Item label="擅长领域" name="specialty">
            <Input placeholder="请输入擅长领域" />
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue="active">
            <Select options={[{ value: 'active', label: '在诊' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}