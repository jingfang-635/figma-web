import { Layout as AntLayout, Menu, Badge } from 'antd';
import {
  HomeOutlined,
  PlusOutlined,
  MedicineBoxOutlined,
  SkinOutlined,
  UserOutlined,
  CalendarOutlined,
  FileDoneOutlined,
  TeamOutlined,
  GoldOutlined,
  StarOutlined,
  EnvironmentOutlined,
  PictureOutlined,
  NotificationOutlined,
  ReadOutlined,
  AppstoreOutlined,
  CommentOutlined,
  HighlightOutlined,
  BellOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  AuditOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

const { Sider, Header, Content } = AntLayout;

const CLINIC_ITEMS: { key: string; label: string; icon: ReactNode }[] = [
  { key: '/', label: '首页', icon: <HomeOutlined /> },
  { key: '/organization', label: '机构信息', icon: <PlusOutlined /> },
  { key: '/departments', label: '科室管理', icon: <MedicineBoxOutlined /> },
  { key: '/doctors', label: '医生管理', icon: <SkinOutlined /> },
  { key: '/schedules', label: '排班管理', icon: <CalendarOutlined /> },
  { key: '/appointments', label: '预约记录', icon: <FileDoneOutlined /> },
  { key: '/patients', label: '患者管理', icon: <TeamOutlined /> },
  { key: '/orders', label: '订单管理', icon: <GoldOutlined /> },
  { key: '/reviews', label: '评价管理', icon: <StarOutlined /> },
];

const OPS_ITEMS: { key: string; label: string; icon: ReactNode }[] = [
  { key: '/addresses', label: '地址管理', icon: <EnvironmentOutlined /> },
  { key: '/banners', label: '广告图管理', icon: <PictureOutlined /> },
  { key: '/announcements', label: '公告管理', icon: <NotificationOutlined /> },
  { key: '/news', label: '新闻列表', icon: <ReadOutlined /> },
  { key: '/news-categories', label: '新闻分类', icon: <AppstoreOutlined /> },
  { key: '/nav-items', label: '导航栏', icon: <MenuOutlined /> },
  { key: '/feedbacks', label: '意见反馈', icon: <CommentOutlined /> },
  { key: '/appointment-rules', label: '预约规则', icon: <HighlightOutlined /> },
  { key: '/notifications', label: '消息通知', icon: <BellOutlined /> },
];

const SYS_ITEMS: { key: string; label: string; icon: ReactNode }[] = [
  { key: '/users', label: '用户管理', icon: <UserOutlined /> },
  { key: '/roles', label: '角色管理', icon: <SafetyCertificateOutlined /> },
  { key: '/operation-logs', label: '操作日志', icon: <AuditOutlined /> },
];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider width={220} className="app-sider" theme="light">
        <div className="sider-brand">
          <div className="brand-title">阳光医疗门诊</div>
          <div className="brand-subtitle">预约挂号管理后台</div>
        </div>
        <div className="sider-menu">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={[
              { key: 'g1', type: 'group', label: <span className="menu-group-empty"> </span>, children: CLINIC_ITEMS },
              { key: 'g2', type: 'group', label: '系统运营', children: OPS_ITEMS },
              { key: 'g3', type: 'group', label: '系统管理', children: SYS_ITEMS },
            ]}
            onClick={({ key }) => navigate(key)}
          />
        </div>
        <div className="sider-footer">
          <div className="user-avatar">{(user?.username || 'A').charAt(0).toUpperCase()}</div>
          <div className="user-meta">
            <div className="user-name">{user?.username || 'admin'}</div>
            <div className="user-role">{user?.role || '系统管理员'}</div>
          </div>
          <a className="user-logout" onClick={logout}>退出</a>
        </div>
      </Sider>
      <AntLayout>
        <Header className="app-header">
          <div />
          <div className="header-right">
            <Badge dot>
              <BellOutlined style={{ fontSize: 16 }} />
            </Badge>
            <SettingOutlined style={{ fontSize: 16 }} />
          </div>
        </Header>
        <Content className="app-content">{children}</Content>
      </AntLayout>
    </AntLayout>
  );
}