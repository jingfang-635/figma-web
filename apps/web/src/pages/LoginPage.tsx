import { Button, Card, Form, Input, App } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      await login(values.username, values.password);
      navigate('/');
    } catch (e: any) {
      message.error(e.message || '登录失败');
    }
  };

  return (
    <div className="login-page">
      <Card className="login-card">
        <div className="login-brand">
          <div className="login-title">阳光医疗门诊</div>
          <div className="login-subtitle">预约挂号管理后台</div>
        </div>
        <Form onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}