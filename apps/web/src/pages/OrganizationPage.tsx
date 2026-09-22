import { useEffect, useState } from 'react';
import { Button, Card, Col, Form, Input, Row, Statistic, message } from 'antd';
import { api } from '../api/client';

export default function OrganizationPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, any> | null>(null);

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
          <div className="page-title">机构信息</div>
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
        title="机构基础信息"
        extra={<span className="card-hint">小程序首页、预约详情和后台使用同一份机构资料</span>}
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
          <Button type="primary" htmlType="submit" loading={loading}>保存机构信息</Button>
        </Form>
      </Card>
    </div>
  );
}