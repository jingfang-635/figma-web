import { Layout as AntLayout, Avatar } from 'antd';
import { PlusOutlined, RightOutlined } from '@ant-design/icons';
import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

const { Sider, Header, Content } = AntLayout;

/** 菜单图标全部取自 Layout IR 导出资产（public/assets/nav），禁止 emoji 或自制图形 */
function NavIcon({ name, size = 20 }: { name: string; size?: number }) {
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

/** 一级菜单（几何：首项文字 y84、节距 44px，文字 x57 / 图标 x27） */
const TOP_ITEMS: Item[] = [
  { key: '/', label: '首页', icon: '首页' },
  { key: '/organization', label: '机构信息', icon: '机构信息' },
  { key: '/departments', label: '科室管理', icon: '科室管理' },
  { key: '/doctors', label: '医生管理', icon: '医生管理' },
  { key: '/schedules', label: '排班管理', icon: '排班管理' },
  { label: '预约记录', icon: '预约记录', badge: '3' },
  { label: '患者管理', icon: '患者管理' },
  { label: '订单管理', icon: '订单管理' },
  { label: '评价管理', icon: '评价管理' },
];

/** 未在原型画出的屏：完整还原导航外观，但灰显禁用（页面范围=只做已画屏） */
const OPS_ITEMS: Item[] = [
  { label: '地址管理', icon: '地址管理' },
  { label: '广告图管理', icon: '广告图管理' },
  { label: '公告管理', icon: '公告管理' },
  { label: '新闻管理', icon: '新闻管理' },
  { label: '新闻列表', icon: '' },
  { label: '新闻分类', icon: '' },
  { label: '导航栏', icon: '导航栏' },
  { label: '意见反馈', icon: '意见反馈' },
  { label: '预约规则', icon: '预约规则' },
  { label: '消息通知', icon: '消息通知' },
];

const SYS_ITEMS: Item[] = [
  { label: '用户管理', icon: '用户管理' },
  { label: '角色管理', icon: '角色管理' },
  { label: '操作日志', icon: '操作日志' },
];

const GROUPS = [
  { label: '系统运营', icon: '系统运营', items: OPS_ITEMS, className: 'nav-group-ops' },
  { label: '系统管理', icon: '系统管理', items: SYS_ITEMS, className: 'nav-group-sys' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const renderTop = () =>
    TOP_ITEMS.map((it) => (
      <div
        key={it.label}
        className={`nav-item nav-top${it.key ? '' : ' nav-disabled'}`}
        onClick={it.key ? () => navigate(it.key!) : undefined}
      >
        <NavIcon name={it.icon} />
        <span className="nav-label">{it.label}</span>
        {it.badge ? <span className="nav-badge">{it.badge}</span> : null}
      </div>
    ));

  const renderGroup = (g: (typeof GROUPS)[number]) => (
    <div key={g.label} className="nav-group-wrap">
      <div className={`nav-item nav-group`}>
        <NavIcon name={g.icon} size={17} />
        <span className="nav-label">{g.label}</span>
        <RightOutlined className="nav-arrow" />
      </div>
      {g.items.map((it) =>
        it.icon ? (
          <div key={it.label} className="nav-item nav-sub nav-disabled">
            <NavIcon name={it.icon} size={17} />
            <span className="nav-label">{it.label}</span>
          </div>
        ) : (
          <div key={it.label} className="nav-item nav-sub2 nav-disabled">
            <span className="nav-label">{it.label}</span>
          </div>
        ),
      )}
    </div>
  );

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider width={220} className="app-sider" theme="light">
        <div className="sider-brand">
          <div className="brand-logo">
            <PlusOutlined />
          </div>
          <div className="brand-meta">
            <div className="brand-title">阳光医疗门诊</div>
            <div className="brand-subtitle">预约挂号管理后台</div>
          </div>
        </div>
        <nav className="sider-nav">
          {renderTop()}
          <div className="nav-divider" />
          {GROUPS.map(renderGroup)}
        </nav>
      </Sider>
      <AntLayout>
        <Header className="app-header">
          <div className="header-right">
            <Avatar className="header-avatar" size={28}>
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