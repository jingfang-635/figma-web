import { Layout as AntLayout, Avatar } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { brand, sidebarItems } from '../../generated/screenConfigs';

const { Sider, Header, Content } = AntLayout;

/** 菜单图标全部取自 Layout IR 导出资产（public/assets/nav），禁止 emoji 或自制图形 */
function NavIcon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span className="nav-ic">
      <img
        src={`/assets/nav/${encodeURIComponent(name)}.png`}
        alt=""
        width={size}
        height={size}
      />
    </span>
  );
}

type Item = { key?: string; label: string; icon: string; badge?: string };

/** 侧栏菜单：标签/顺序/徽标/路由全部来自 Layout IR（codegen 下发 sidebarItems），
    页面层不复述业务文案——项数即 IR 项数，无分组标题、无二级菜单；
    正常色走 tokens；原型未画出路由的项保留外观但不可跳转。 */
const TOP_ITEMS: Item[] = sidebarItems.map((it) => ({
  key: it.route ?? undefined,
  label: it.label,
  icon: it.icon,
  badge: it.badge ?? undefined,
}));

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider width={220} className="app-sider" theme="light">
        <div className="sider-brand">
          <div className="brand-logo">
            <PlusOutlined />
          </div>
          <div className="brand-meta">
            <div className="brand-title">{brand.title}</div>
            <div className="brand-subtitle">{brand.subtitle}</div>
          </div>
        </div>
        <nav className="sider-nav">
          {TOP_ITEMS.map((it) => (
            <div
              key={it.label}
              className={`nav-item nav-top${it.key && it.key === location.pathname ? ' active' : ''}${it.key ? '' : ' nav-inactive'}`}
              onClick={it.key ? () => navigate(it.key!) : undefined}
            >
              <NavIcon name={it.icon} />
              <span className="nav-label">{it.label}</span>
              {it.badge ? <span className="nav-badge">{it.badge}</span> : null}
            </div>
          ))}
        </nav>
      </Sider>
      <AntLayout>
        <Header className="app-header">
          <div className="header-right">
            <Avatar className="header-avatar" size={24} style={{ fontSize: 13 }}>
              A
            </Avatar>
            <div className="header-user-meta">
              <div className="header-user-name">{user?.username || 'admin'}</div>
              <div className="header-user-role">{user?.name || '系统管理员'}</div>
            </div>
            <a className="header-logout" onClick={logout}>
              退出
            </a>
          </div>
        </Header>
        <Content className="app-content">{children}</Content>
      </AntLayout>
    </AntLayout>
  );
}
