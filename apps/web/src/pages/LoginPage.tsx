import { App, Button, Card, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      navigate('/', { replace: true });
    } catch (err) {
      message.error(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <Card style={{ width: 400 }} bordered={false}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 48,
              height: 48,
              margin: '0 auto 8px',
              borderRadius: 8,
              background: '#e8f7ef',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 18 18" fill="#16a34a">
              <rect x="7" y="2" width="4" height="14" rx="1" />
              <rect x="2" y="7" width="14" height="4" rx="1" />
            </svg>
          </div>
          <Typography.Title level={3} style={{ margin: '8px 0 4px' }}>
            阳光医疗门诊
          </Typography.Title>
          <Typography.Text type="secondary">预约挂号管理后台</Typography.Text>
        </div>
        <Form
          layout="vertical"
          initialValues={{ email: 'admin@sunshine.clinic', password: 'admin123' }}
          onFinish={(values) => void onFinish(values)}
        >
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center', fontSize: 12, marginBottom: 0 }}>
          默认账号：admin@sunshine.clinic / admin123
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
