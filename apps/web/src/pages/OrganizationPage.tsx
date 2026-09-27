import { useEffect, useState } from 'react';
import { Button, Form, Input, App } from 'antd';
import { api } from '../api/client';
import { getScreenByRoute } from '../generated/screenConfigs';

/** gate 冻结样本来自 spec（app-spec.json → screens[].sample → 生成物），页面不自带副本 */
type OrgSample = {
  stats?: Record<string, number>;
  blankStats?: Record<string, number>;
  org?: Record<string, string>;
};

export default function OrganizationPage() {
  const config = getScreenByRoute(window.location.pathname);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const { message } = App.useApp();

  const gate = new URLSearchParams(window.location.search).get('visualGate') === '1';

  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    if (gate) {
      const sample = (config?.sample ?? {}) as OrgSample;
      setStats(sample.stats ?? null);
      form.setFieldsValue(sample.org ?? {});
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
    // 统计 key 由 spec 的 stats 声明派生（不手写 key 清单），接口缺字段时补 0 占位
    const blank = Object.fromEntries((config?.stats || []).map((st) => [st.key, 0]));
    api<Record<string, number>>('/dashboard/stats').then((d) => setStats({ ...blank, ...d })).catch(() => {});
  }, [gate, form, config]);

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
          <div className="page-title">{config?.title}</div>
          <div className="page-subtitle">{config?.subtitle}</div>
        </div>
      </div>

      {/* KPI 条：白卡几何照 layout-ir（与统计屏 kpi 条同款） */}
      <div className="kpi-strip">
        {(config?.stats || []).map((st) => (
          <div className="kpi-card" key={st.key}>
            <div className="kpi-label">{st.label}</div>
            <div className="kpi-value">{stats ? (stats[st.key] ?? 0) : 0}</div>
          </div>
        ))}
      </div>

      {/* 主卡：标题+副标题在左，保存按钮在卡头右侧（照 layout-ir） */}
      <div className="org-card">
        <div className="org-card-head">
          <div>
            <div className="org-card-title">{config?.formCard?.title || '机构基础信息'}</div>
            <div className="card-hint">{config?.formCard?.subtitle}</div>
          </div>
          <Button className="org-save" type="primary" htmlType="submit" form="org-form" loading={loading}>
            {config?.formCard?.primaryAction}
          </Button>
        </div>

        {/* 横向双列表单：列宽 = label 宽 + 段间距 + 控件宽（逐项照 layout-ir），全宽行走 grid 跨列 */}
        <Form
          id="org-form"
          form={form}
          className="org-form"
          onFinish={onSave}
          colon={false}
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