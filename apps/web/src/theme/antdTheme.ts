/* Generated from Visual IR / Layout IR. Re-run: node scripts/generate-tokens-css.mjs */
import type { ThemeConfig } from 'antd';

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1677FF',
    colorSuccess: '#52C41A',
    colorWarning: '#FA8C16',
    colorError: '#FF4D4F',
    colorInfo: '#1677FF',
    colorBgLayout: '#F5F7FA',
    colorBgContainer: '#FFFFFF',
    colorText: '#262626',
    colorTextSecondary: '#595959',
    colorBorder: '#E5E7EB',
    borderRadius: 8,
    fontFamily: "\"Noto Sans SC\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif",
    fontSize: 14,
    controlHeight: 32,
  },
  components: {
    Layout: {
      headerBg: '#FFFFFF',
      siderBg: '#FFFFFF',
      bodyBg: '#F5F7FA',
      headerHeight: 52,
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#E6F7FF',
      itemSelectedColor: '#1890FF',
      itemColor: '#595959',
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
  },
};
