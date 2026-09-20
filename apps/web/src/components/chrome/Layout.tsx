import { Avatar, Badge, Layout as AntLayout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { BrandMark, GroupIcon, NavIcon } from '../../config/navIcons';
import { screenConfigs, sidebarChrome } from '../../generated/screenConfigs';
import { StatsProvider, useStats } from './StatsContext';

const { Header, Sider, Content } = AntLayout;

/** Figma sidebar still uses the original labels; frame names were renamed. */
const NAV_LABEL: Record<string, string> = {
  广告位管理: '广告图管理',
  导航栏管理: '导航栏',
  通知管理: '消息通知',
};

function navLabel(name: string): string {
  return NAV_LABEL[name] ?? name;
}

function routeOf(name: string): string | undefined {
  return screenConfigs.find((s) => s.name === name)?.route;
}

function AppHeader() {
  const { user, logout } = useAuth();
  const displayName = user?.email?.split('@')[0] || user?.name || 'admin';
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <Header className="app-header">
      <div className="header-user">
        <Avatar
          size={30}
          style={{ backgroundColor: '#E6F7FF', color: '#1890FF', fontSize: 13, fontWeight: 500, flexShrink: 0 }}
        >
          {initial}
        </Avatar>
        <div className="header-meta">
          <div className="header-name">{displayName}</div>
          <div className="header-role">系统管理员</div>
        </div>
        <button type="button" className="header-logout" onClick={logout}>
          退出
        </button>
      </div>
    </Header>
  );
}

function AppSider() {
  const navigate = useNavigate();
  const location = useLocation();
  const stats = useStats();

  const selectedKey = useMemo(() => {
    const hit = screenConfigs.find(
      (s) => s.route === location.pathname || (s.route !== '/' && location.pathname.startsWith(s.route)),
    );
    return hit?.name ?? '首页';
  }, [location.pathname]);

  const items: MenuProps['items'] = useMemo(() => {
    const result: MenuProps['items'] = [];
    for (const group of sidebarChrome.groups) {
      if (!group.label) {
        for (const name of group.items) {
          const to = routeOf(name);
          if (!to) continue;
          const label =
            name === '预约记录' && stats.pendingAppointments > 0 ? (
              <span className="nav-item-with-badge">
                {navLabel(name)}
                <Badge count={stats.pendingAppointments} size="small" />
              </span>
            ) : (
              navLabel(name)
            );
          result!.push({
            key: name,
            icon: <NavIcon name={name} />,
            label,
            onClick: () => navigate(to),
          });
        }
        continue;
      }

      if (group.id === 'ops') {
        const children: MenuProps['items'] = [];
        const newsChildren: MenuProps['items'] = [];
        for (const name of group.items) {
          const to = routeOf(name);
          if (!to) continue;
          if (name === '新闻列表' || name === '新闻分类') {
            newsChildren!.push({
              key: name,
              label: navLabel(name),
              onClick: () => navigate(to),
            });
            continue;
          }
          children!.push({
            key: name,
            icon: <NavIcon name={name} />,
            label: navLabel(name),
            onClick: () => navigate(to),
          });
        }
        // Insert news submenu before 导航栏
        const navIdx = children!.findIndex((c) => c && 'key' in c && c.key === '导航栏管理');
        const newsItem = {
          key: '新闻管理',
          icon: <GroupIcon id="新闻管理" />,
          label: '新闻管理',
          children: newsChildren,
        };
        if (navIdx >= 0) children!.splice(navIdx, 0, newsItem);
        else children!.push(newsItem);

        result!.push({ type: 'divider', key: `div-${group.id}` });
        result!.push({
          key: group.id,
          icon: <GroupIcon id={group.id} />,
          label: group.label,
          children,
        });
        continue;
      }

      result!.push({ type: 'divider', key: `div-${group.id}` });
      result!.push({
        key: group.id,
        icon: <GroupIcon id={group.id} />,
        label: group.label,
        children: group.items
          .map((name) => {
            const to = routeOf(name);
            if (!to) return null;
            return {
              key: name,
              icon: <NavIcon name={name} />,
              label: navLabel(name),
              onClick: () => navigate(to),
            };
          })
          .filter(Boolean) as MenuProps['items'],
      });
    }
    return result;
  }, [navigate, stats.pendingAppointments]);

  const openKeys = useMemo(() => {
    const keys = ['ops', 'system', '新闻管理'];
    return keys;
  }, []);

  return (
    <Sider width={Number(sidebarChrome.width) || 220} className="app-sider" theme="light">
      <div className="sider-brand">
        <div className="sider-brand-mark" aria-hidden>
          <BrandMark />
        </div>
        <div>
          <div className="sider-brand-title">{sidebarChrome.brandTitle}</div>
          <div className="sider-brand-sub">{sidebarChrome.brandSubtitle}</div>
        </div>
      </div>
      <div className="sider-menu-scroll">
        <Menu
          mode="inline"
          className="app-sider-menu"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={openKeys}
          inlineIndent={16}
          expandIcon={() => <span className="nav-arrow">▶</span>}
          items={items}
        />
      </div>
    </Sider>
  );
}

function Shell() {
  return (
    <AntLayout className="app-shell">
      <AppSider />
      <AntLayout>
        <AppHeader />
        <Content className="app-content">
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}

export function Layout() {
  return (
    <StatsProvider>
      <Shell />
    </StatsProvider>
  );
}
