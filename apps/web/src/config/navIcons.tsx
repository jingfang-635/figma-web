import type { ReactNode } from 'react';
import {
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  BellOutlined,
  CalendarOutlined,
  CloudUploadOutlined,
  CommentOutlined,
  CrownOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FileDoneOutlined,
  FireOutlined,
  FormOutlined,
  GoldOutlined,
  HighlightOutlined,
  HomeOutlined,
  KeyOutlined,
  MedicineBoxOutlined,
  NotificationOutlined,
  PictureOutlined,
  PrinterOutlined,
  ProfileOutlined,
  PushpinOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  SearchOutlined,
  SettingOutlined,
  SkinOutlined,
  SmileOutlined,
  StarOutlined,
  StopOutlined,
  TagOutlined,
  TagsOutlined,
  TeamOutlined,
  UnlockOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ComponentType } from 'react';
import assetManifest from '../generated/assetManifest.json';

type IconComponent = ComponentType<{ style?: React.CSSProperties }>;

/** Nav icon color per Figma sidebar palette (kept for visual parity). */
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

/** Emoji-free icon mapping for all nav entries (aliases included). */
const ICON_MAP: Record<string, IconComponent> = {
  首页: HomeOutlined,
  机构信息: MedicineBoxOutlined,
  科室管理: SkinOutlined,
  医生管理: UserOutlined,
  排班管理: CalendarOutlined,
  预约记录: FileDoneOutlined,
  患者管理: TeamOutlined,
  订单管理: GoldOutlined,
  评价管理: StarOutlined,
  地址管理: EnvironmentOutlined,
  广告位管理: PictureOutlined,
  广告图管理: PictureOutlined,
  公告管理: NotificationOutlined,
  新闻列表: ProfileOutlined,
  新闻分类: TagsOutlined,
  新闻管理: ReadOutlined,
  导航栏管理: AppstoreOutlined,
  导航栏: AppstoreOutlined,
  意见反馈: CommentOutlined,
  预约规则: HighlightOutlined,
  通知管理: BellOutlined,
  消息通知: BellOutlined,
  系统管理: SettingOutlined,
  用户管理: UserOutlined,
  角色管理: SafetyCertificateOutlined,
  操作日志: AuditOutlined,
};

/** Sidebar submenu group icons (previously 📊 / ⚙️ / 📰 emoji). */
const GROUP_ICON_MAP: Record<string, IconComponent> = {
  ops: BarChartOutlined,
  system: SettingOutlined,
  新闻管理: ReadOutlined,
};

export function GroupIcon({ id }: { id: string }) {
  const Comp = GROUP_ICON_MAP[id] ?? BarChartOutlined;
  return <Comp style={{ color: '#8c8c8c', fontSize: 16 }} />;
}

/** Department visual: colored tile + vector glyph (replaces emoji tiles). */
export const DEPT_VISUAL: Record<string, { bg: string; icon: IconComponent }> = {
  内科: { bg: '#e6f4ff', icon: MedicineBoxOutlined },
  儿科: { bg: '#fff7e6', icon: SmileOutlined },
  妇科: { bg: '#fff0f6', icon: CrownOutlined },
  口腔科: { bg: '#f6ffed', icon: StopOutlined },
  皮肤科: { bg: '#f9f0ff', icon: FireOutlined },
  默认: { bg: '#f5f5f5', icon: PushpinOutlined },
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

export function NavIcon({ name }: { name: string }): ReactNode {
  const src = (assetManifest.nav as Record<string, string> | undefined)?.[name];
  const size = 16;
  if (src) {
    return <img src={src} alt="" width={size} height={size} className="nav-icon-img" />;
  }
  const Comp = ICON_MAP[name] ?? ReadOutlined;
  const color = NAV_ICON_COLOR[name] ?? 'var(--color-primary)';
  return <Comp style={{ color, fontSize: size }} />;
}

/** Leading emoji + ZWJ/VS16 sequence (e.g. "📝 修改" → "修改"). */
const EMOJI_PREFIX_RE =
  /^(?:[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]+\s*)+/u;

/** Strip a leading emoji from generated labels coming from the Figma texts. */
export function stripIconPrefix(label: string): string {
  return label.replace(EMOJI_PREFIX_RE, '').trim();
}

/** Action labels → vector icon (replaces emoji prefixes in generated configs). */
const ACTION_ICON_MAP: Record<string, IconComponent> = {
  导出: DownloadOutlined,
  修改: FormOutlined,
  编辑: FormOutlined,
  删除: DeleteOutlined,
  保存: SaveOutlined,
  标签: TagOutlined,
  预览: PrinterOutlined,
  回复: CommentOutlined,
  隐藏: EyeInvisibleOutlined,
  解禁: UnlockOutlined,
  查看详情: EyeOutlined,
  批量排班: CalendarOutlined,
  批量导入: UploadOutlined,
  // 第二轮：与 figma-plugin EMOJI_MAP 对齐（原型残留操作按钮 emoji）
  重置密码: KeyOutlined,
  上传图片: CloudUploadOutlined,
  查询: SearchOutlined,
};

export function ActionIcon({ label, size = 12 }: { label: string; size?: number }): ReactNode {
  const Comp = ACTION_ICON_MAP[stripIconPrefix(label)];
  if (!Comp) return null;
  return <Comp style={{ fontSize: size, marginRight: 2 }} />;
}