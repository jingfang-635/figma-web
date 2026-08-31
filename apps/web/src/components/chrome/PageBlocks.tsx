import { Card } from 'antd';
import type { ReactNode } from 'react';

export interface KpiItem {
  key: string;
  label: string;
  value: string | number;
  icon?: ReactNode;
}

export function KpiRow({ items }: { items: KpiItem[] }) {
  return (
    <div className="kpi-row">
      {items.map((item) => (
        <Card size="small" className="kpi-card" bordered={false} key={item.key}>
          <div>
            <div className="kpi-label">{item.label}</div>
            <div className="kpi-value">{item.value}</div>
          </div>
          {item.icon ? <span className="kpi-icon">{item.icon}</span> : null}
        </Card>
      ))}
    </div>
  );
}

export function PageHeaderBlock({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="page-header-block">
      <h1 className="page-title">{title}</h1>
      {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
    </div>
  );
}
