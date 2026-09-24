/* Generated from Visual IR / Layout IR. Re-run: node scripts/generate-tokens-css.mjs */
import type { ThemeConfig } from 'antd';

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1890FF',
    colorSuccess: '#52C41A',
    colorWarning: '#FA8C16',
    colorError: '#FF4D4F',
    colorInfo: '#1890FF',
    colorBgLayout: '#F5F7FA',
    colorBgContainer: '#FFFFFF',
    colorText: '#1F2937',
    colorTextSecondary: '#595959',
    colorBorder: '#E5E7EB',
    borderRadius: 8,
    fontFamily: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: 14,
    controlHeight: 32,
  },
  components: {
    Layout: {
      headerBg: '#FFFFFF',
      siderBg: '#FFFFFF',
      bodyBg: '#F5F7FA',
      headerHeight: 56,
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#E6F4FF',
      itemSelectedColor: '#262626',
      itemColor: '#8C8C8C',
      itemHoverBg: '#F5F5F5',
      itemBorderRadius: 6,
      iconSize: 16,
      iconMarginInlineEnd: 13,
    },
    Table: {
      headerBg: '#FAFAFA',
    },
    Card: {
      borderRadiusLG: 8,
    },
    Modal: {
      contentBg: '#FFFFFF',
      headerBg: '#FFFFFF',
      boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
      titleFontSize: 16,
    },
  },
};