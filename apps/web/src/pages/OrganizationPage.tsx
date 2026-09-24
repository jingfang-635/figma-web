import { useEffect, useState } from 'react';
import { Button, Card, Col, Form, Input, Row, Statistic, App } from 'antd';
import { api } from '../api/client';
import { screenConfigs } from '../generated/screenConfigs';

export default function OrganizationPage() {
  const config = screenConfigs.find((s) => s.name === '机构信息');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, any> | null>(null);
  const { message } = App.useApp();

  useEffect(() => {
    api<Record<string, any>>('/organization').then((d) => form.setFieldsValue(d)).catch(() => {});
    api<Record<string, any>>('/dashboard/stats').then(setStats).catch(() => {});
  }, [form]);

  const onSave = async (values: Record<string, any>) => {
    setLoading(true);
    try {
      await api('/organization', { method: 'PUT', body: JSON.stringify(values) });
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

      <Row gutter={16} className="kpi-row">
        {(config?.stats || []).map((st) => (
          <Col span={6} key={st.key}>
            <Card><Statistic title={st.label} value={stats ? (stats[st.key] ?? 0) : 0} /></Card>
          </Col>
        ))}
      </Row>

      <Card
        title={config?.formCard?.title || '机构基础信息'}
        extra={<span className="card-hint">{config?.formCard?.subtitle}</span>}
      >
        <Form form={form} layout="vertical" onFinish={onSave} style={{ maxWidth: 640 }}>
          <Form.Item label="机构名称" name="name" rules={[{ required: true, message: '请输入机构名称' }]}>
            <Input placeholder="阳光医疗门诊" />
          </Form.Item>
          <Form.Item label="联系电话" name="phone">
            <Input placeholder="010-8888 8888" />
          </Form.Item>
          <Form.Item label="机构副标题" name="subtitle">
            <Input placeholder="以患者为中心 · 专业守护健康" />
          </Form.Item>
          <Form.Item label="营业时间" name="hours">
            <Input placeholder="周一至周日 08:00-17:30" />
          </Form.Item>
          <Form.Item label="机构地址" name="address">
            <Input placeholder="北京市示范区健康路 88 号" />
          </Form.Item>
          <Form.Item label="机构简介" name="intro">
            <Input.TextArea rows={4} placeholder="正规医疗机构，拥有专业医疗团队，为患者提供贴心、便捷的门诊服务。" maxLength={1000} showCount />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            {config?.formCard?.primaryAction || '保存机构信息'}
          </Button>
        </Form>
      </Card>
    </div>
  );
}