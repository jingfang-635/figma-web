import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { BrowserRouter } from 'react-router-dom';
import { antdTheme } from './theme/antdTheme';
import './styles/tokens.css';
import './styles/app.css';
import App from './App';

dayjs.locale('zh-cn');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* autoInsertSpace：antd 默认给「两字中文按钮」插入空格（取消 → 取 消，按钮 60 → 65px），
        Figma 原型无此间距（IR 两字按钮文本恰 26 = 2em、按钮 60 宽）→ 关掉 */}
    <ConfigProvider locale={zhCN} theme={antdTheme} button={{ autoInsertSpace: false }}>
      <AntApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);