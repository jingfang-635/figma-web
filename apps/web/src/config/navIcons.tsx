import type { ReactNode } from 'react';
import {
  HomeOutlined,
  BankOutlined,
  MedicineBoxOutlined,
  UserOutlined,
  CalendarOutlined,
  ScheduleOutlined,
  TeamOutlined,
  ShoppingOutlined,
  StarOutlined,
  EnvironmentOutlined,
  PictureOutlined,
  NotificationOutlined,
  ReadOutlined,
  AppstoreOutlined,
  MessageOutlined,
  SettingOutlined,
  BellOutlined,
  SafetyCertificateOutlined,
  FileSearchOutlined,
  UnorderedListOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import assetManifest from '../generated/assetManifest.json';

export const NAV_ICON_COLOR: Record<string, string> = {
  首页: '#1890ff',
  机构信息: '#13c2c2',
  科室管理: '#52c41a',
  医生管理: '#722ed1',
  排班管理: '#fa8c16',
  预约记录: '#eb2f96',
  患者管理: '#2f54eb',
  订单管理: '#fa541c',
  评价管理: '#faad14',
  地址管理: '#13c2c2',
  广告位管理: '#eb2f96',
  公告管理: '#1890ff',
  新闻列表: '#52c41a',
  新闻分类: '#52c41a',
  导航栏管理: '#722ed1',
  意见反馈: '#fa8c16',
  预约规则: '#2f54eb',
  通知管理: '#eb2f96',
  用户管理: '#1890ff',
  角色管理: '#13c2c2',
  操作日志: '#8c8c8c',
};

const ICON_MAP: Record<string, typeof HomeOutlined> = {
  首页: HomeOutlined,
  机构信息: BankOutlined,
  科室管理: MedicineBoxOutlined,
  医生管理: UserOutlined,
  排班管理: CalendarOutlined,
  预约记录: ScheduleOutlined,
  患者管理: TeamOutlined,
  订单管理: ShoppingOutlined,
  评价管理: StarOutlined,
  地址管理: EnvironmentOutlined,
  广告位管理: PictureOutlined,
  公告管理: NotificationOutlined,
  新闻列表: UnorderedListOutlined,
  新闻分类: TagsOutlined,
  导航栏管理: AppstoreOutlined,
  意见反馈: MessageOutlined,
  预约规则: SettingOutlined,
  通知管理: BellOutlined,
  用户管理: UserOutlined,
  角色管理: SafetyCertificateOutlined,
  操作日志: FileSearchOutlined,
};

export const NAV_EMOJI: Record<string, string> = {
  首页: '🏠',
  机构信息: '🏥',
  科室管理: '🏷️',
  医生管理: '👨‍⚕️',
  排班管理: '📅',
  预约记录: '📋',
  患者管理: '👥',
  订单管理: '💰',
  评价管理: '⭐',
  地址管理: '📍',
  广告位管理: '🖼️',
  广告图管理: '🖼️',
  公告管理: '📢',
  新闻列表: '📰',
  新闻分类: '📰',
  新闻管理: '📰',
  导航栏管理: '🧭',
  导航栏: '🧭',
  意见反馈: '💬',
  预约规则: '📏',
  通知管理: '🔔',
  消息通知: '🔔',
  用户管理: '👤',
  角色管理: '🔐',
  操作日志: '📝',
};

export function NavIcon({ name }: { name: string }): ReactNode {
  const src = (assetManifest.nav as Record<string, string> | undefined)?.[name];
  const size = 16;
  if (src) {
    return <img src={src} alt="" width={size} height={size} className="nav-icon-img" />;
  }
  const emoji = NAV_EMOJI[name];
  if (emoji) {
    return (
      <span className="nav-emoji" aria-hidden>
        {emoji}
      </span>
    );
  }
  const Comp = ICON_MAP[name] ?? ReadOutlined;
  const color = NAV_ICON_COLOR[name] ?? 'var(--color-primary)';
  return <Comp style={{ color, fontSize: size }} />;
}

export const DEPT_VISUAL: Record<string, { bg: string; emoji: string }> = {
  内科: { bg: '#e6f4ff', emoji: '🫁' },
  儿科: { bg: '#fff7e6', emoji: '🧸' },
  妇科: { bg: '#fff0f6', emoji: '🌸' },
  口腔科: { bg: '#f6ffed', emoji: '🦷' },
  皮肤科: { bg: '#f9f0ff', emoji: '🩺' },
  默认: { bg: '#f5f5f5', emoji: '🏥' },
};

export function getDeptVisual(name: string) {
  const src = (assetManifest.depts as Record<string, string> | undefined)?.[name];
  const fallback = DEPT_VISUAL[name] ?? DEPT_VISUAL['默认'];
  return { ...fallback, src };
}

export function BrandMark() {
  const src = assetManifest.brand as string | null;
  if (src) {
    return <img src={src} alt="" width={36} height={36} className="sider-brand-img" />;
  }
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="#ffffff">
      <rect x="7" y="2" width="4" height="14" rx="1.2" />
      <rect x="2" y="7" width="14" height="4" rx="1.2" />
    </svg>
  );
}
