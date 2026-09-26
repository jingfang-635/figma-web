import { useEffect, useState } from 'react';
import { Button, Form, Input, App } from 'antd';
import { api } from '../api/client';
import { screenConfigs } from '../generated/screenConfigs';

/** visualGate=1 时冻结 sample 数据（与原型逐字一致：6/6/0/0），保证闸门可像素对齐 */
const GATE_STATS: Record<string, number> = { departments: 6, doctors: 6, pending: 0, ordersToday: 0 };
const ZERO_STATS: Record<string, number> = { departments: 0, doctors: 0, pending: 0, ordersToday: 0 };
const GATE_ORG: Record<string, string> = {
  name: '阳光医疗门诊',
  phone: '010-8888 8888',
  subtitle: '以患者为中心 · 专业守护健康',
  hours: '周一至周日 08:00-17:30',
  address: '北京市示范区健康路 88 号',
  intro: '正规医疗机构，拥有专业医疗团队，为患者提供贴心、便捷的门诊服务。',
};

export default function OrganizationPage() {
  const config = screenConfigs.find((s) => s.name === '机构信息');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const { message } = App.useApp();

  const gate = new URLSearchParams(window.location.search).get('visualGate') === '1';

  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    if (gate) {
      setStats(GATE_STATS);
      form.setFieldsValue(GATE_ORG);
      return;
    }
    // 契约：GET /organization 返回数组（CrudController.list），单条数据屏取 list[0]
    api<Record<string, any>[]>('/organization')
      .then((list) => {
        const row = Array.isArray(list) ? list[0] : list;
        if (!row) return;
        setEditingId(row.id ?? null);
        const { id, ...fields } = row;
        form.setFieldsValue(fields);
      })
      .catch(() => {});
    api<Record<string, number>>('/dashboard/stats').then((d) => setStats({ ...ZERO_STATS, ...d })).catch(() => {});
  }, [gate, form]);

  const onSave = async (values: Record<string, any>) => {
    setLoading(true);
    try {
      // 有记录 → PUT /{id}；空库 → POST 建第一条
      if (editingId != null) {
        await api(`/organization/${editingId}`, { method: 'PUT', body: JSON.stringify(values) });
      } else {
        await api('/organization', { method: 'POST', body: JSON.stringify(values) });
      }
      message.success('保存成功');
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">{config?.title || '机构信息'}</div>
          <div className="page-subtitle">{config?.subtitle}</div>
        </div>
      </div>

      {/* KPI 条：281x92 白卡（几何同首页 kpi-strip，IR 157:275-286） */}
      <div className="kpi-strip">
        {(config?.stats || []).map((st) => (
          <div className="kpi-card" key={st.key}>
            <div className="kpi-label">{st.label}</div>
            <div className="kpi-value">{stats ? (stats[st.key] ?? 0) : 0}</div>
          </div>
        ))}
      </div>

      {/* 主卡：标题+副标题在左，保存按钮在卡头右侧（IR 157:287-291） */}
      <div className="org-card">
        <div className="org-card-head">
          <div>
            <div className="org-card-title">{config?.formCard?.title || '机构基础信息'}</div>
            <div className="card-hint">{config?.formCard?.subtitle}</div>
          </div>
          <Button className="org-save" type="primary" htmlType="submit" form="org-form" loading={loading}>
            {config?.formCard?.primaryAction || '保存机构信息'}
          </Button>
        </div>

        {/* 横向双列表单：label 右对齐 100px 列 + 输入框 454px；地址/简介全宽 1032px（IR 157:292-309） */}
        <Form
          id="org-form"
          form={form}
          className="org-form"
          onFinish={onSave}
          colon={false}
          requiredMark={(label, info) => (
            <>
              {label}
              {info.required && <span className="org-req">*</span>}
            </>
          )}
        >
          <div className="org-grid">
            <Form.Item label="机构名称" name="name" rules={[{ required: true, message: '请输入机构名称' }]}>
              <Input />
            </Form.Item>
            <Form.Item label="联系电话" name="phone">
              <Input />
            </Form.Item>
            <Form.Item label="机构副标题" name="subtitle">
              <Input />
            </Form.Item>
            <Form.Item label="营业时间" name="hours">
              <Input />
            </Form.Item>
            <Form.Item label="机构地址" name="address" className="org-full">
              <Input />
            </Form.Item>
            <Form.Item label="机构简介" name="intro" className="org-full org-intro">
              <Input.TextArea rows={3} maxLength={1000} showCount />
            </Form.Item>
          </div>
        </Form>
      </div>
    </div>
  );
}