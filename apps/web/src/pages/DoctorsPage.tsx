import { useEffect, useState, useCallback } from 'react';
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, App } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import { getScreenByRoute } from '../generated/screenConfigs';
import { color as token, tonePalette } from '../generated/tokens';

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

/** gate 冻结样本来自 spec（app-spec.json → screens[].sample → 生成物），页面不自带副本 */
type DoctorSample = { stats?: Record<string, any>; rows?: Doctor[] };

/** 头像圆形底色/字色：按本屏路由取 IR 派生的调色板（按行序取用），页面不写死色值 */
const avatarTones = tonePalette[window.location.pathname] ?? [];
const avatarTone = (i: number) => (avatarTones.length ? avatarTones[i % avatarTones.length] : null);

export default function DoctorsPage() {
  const config = getScreenByRoute(window.location.pathname);
  const gate = new URLSearchParams(window.location.search).get('visualGate') === '1';
  const [data, setData] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [stats, setStats] = useState<Record<string, any> | null>(null);
  /** 所属科室下拉：选项取自 /departments 真实数据（原型弹窗默认选中「内科」） */
  const [depts, setDepts] = useState<{ id: number; name: string }[]>([]);
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
      const sample = (config?.sample ?? {}) as DoctorSample;
      setData(sample.rows ?? []);
      setStats(sample.stats ?? null);
    } else {
      load();
      api<Record<string, any>>('/dashboard/stats').then(setStats).catch(() => {});
    }
    api<{ id: number; name: string }[]>('/departments')
      .then((list) => setDepts(Array.isArray(list) ? list : []))
      .catch(() => setDepts([]));
  }, [gate, load, config]);

  const deptOptions = depts.map((d) => ({ value: String(d.id), label: d.name }));
  /** 科室名从 /departments 真实数据解析（不写死 id→名称映射） */
  const deptName = (id: string) => depts.find((d) => String(d.id) === String(id))?.name || '';
  /** 列表筛选「全部科室」默认选中：IR 该处是深色**值**（不是占位符灰），色值走 tokens；
      与排班屏筛选同款，选项与新增弹窗同源（无 onChange，仅按原型呈现默认值） */
  const filterDeptOpts = [{ value: 'all', label: '全部科室' }, ...deptOptions];
  /** 默认选中「内科」（原型弹窗取值）；接口未就绪时退回第一项，不写死 id */
  const deptInit = depts.length ? String((depts.find((d) => d.name === '内科') || depts[0]).id) : undefined;

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
      width: 223,
      render: (_: any, r: Doctor, i: number) => (
        <div className="cell-name">
          <span
            className="cell-avatar"
            style={
              avatarTone(i)
                ? { background: avatarTone(i)!.bg, color: avatarTone(i)!.fg ?? undefined }
                : undefined
            }
          >
            {String(r.name || '').charAt(0)}
          </span>
          <span>
            <div className="cell-title">{r.name}</div>
            <div className="cell-desc">{r.title}</div>
          </span>
        </div>
      ),
    },
    {
      title: '科室',
      key: 'deptName',
      width: 105,
      render: (_: any, r: Doctor) => (
        <Tag className="tag-blue">{deptName(r.deptId)}</Tag>
      ),
    },
    { title: '擅长', dataIndex: 'specialty', key: 'specialty', width: 307, ellipsis: true, render: (v: string) => <span className="cell-text">{v}</span> },
    {
      title: '经验/好评',
      key: 'experience',
      width: 118,
      render: (_: any, r: Doctor) => <span className="cell-text">{`${r.years || 0}年 / ${r.goodRate || 0}%`}</span>,
    },
    { title: '挂号费', key: 'fee', width: 81, render: (_: any, r: Doctor) => <span className="cell-fee">{`¥${r.fee ?? ''}`}</span> },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 89,
      render: (s: string) => (s === 'active' ? <Tag className="tag-green">在诊</Tag> : <Tag>停诊</Tag>),
    },
    {
      title: '操作',
      key: 'actions',
      width: 209,
      className: 'col-actions',
      render: () => (
        <>
          <a className="cell-op">编辑</a>
          <a className="cell-op-del">删除</a>
        </>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">{config?.title}</div>
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
          <div className="card-title-main">{config?.cardTitle || '医生列表'}</div>
          <div className="card-title-sub">挂号费按医生配置，医生停用后用户端不再展示</div>
        </>
      }
      extra={
        <Button type="primary" onClick={() => setModalOpen(true)}>
          新增医生
        </Button>
      }
    >
        <div className="list-toolbar">
          <Space size={12}>
            <Input placeholder="搜索医生、科室或擅长" />
            <Select className="toolbar-select" defaultValue="all" options={filterDeptOpts} />
          </Space>
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
        <Form form={form} layout="horizontal" labelCol={{ flex: '100px' }} labelAlign="right" wrapperCol={{ flex: 'auto' }} colon={false} onFinish={onSave}>
          <Form.Item label="医生头像" style={{ marginBottom: 16 }}>
            <div className="upload-area">
              <div className="upload-box" style={{ width: 80, height: 80, borderRadius: 6 }}>
                <PlusOutlined className="upload-plus" />
                <div className="upload-text">上传头像</div>
              </div>
              <div className="upload-hints">
                <div style={{ color: token.textSecondary, fontWeight: 500 }}>建议尺寸 200×200px</div>
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
          <Form.Item label="所属科室" name="deptId" rules={[{ required: true, message: '请选择所属科室' }]} initialValue={deptInit}>
            <Select placeholder="内科" options={deptOptions} />
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
            <Input.TextArea rows={2} placeholder="请输入擅长领域" style={{ borderRadius: 6 }} />
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue="active">
            <Select options={[{ value: 'active', label: '在诊' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}