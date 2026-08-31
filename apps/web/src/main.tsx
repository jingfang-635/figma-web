import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { antdTheme } from './theme/antdTheme';
import { applyVisualGateClass, isVisualGate } from './visual/gate';
import './styles/tokens.css';
import './styles/app.css';

applyVisualGateClass();

const gate = isVisualGate();
const theme = gate
  ? {
      ...antdTheme,
      token: { ...antdTheme.token, motion: false },
    }
  : antdTheme;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN} theme={theme} wave={{ disabled: gate }}>
      <AntdApp>
        <App />
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
);
