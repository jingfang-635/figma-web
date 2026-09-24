import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, Select, Space, Statistic, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import { screenConfigs, ScreenConfig } from '../generated/screenConfigs';

/** API 路径：资源 key → REST 路径 */
const RESOURCE_PATH: Record<string, string> = {
  departments: '/departments',
  doctors: '/doctors',
  schedules: '/schedules',
  organization: '/organization',
};

export default function ResourceListPage({ resource }: { resource: string }) {
  const config: ScreenConfig | undefined = useMemo(
    () => screenConfigs.find((s) => s.resource === resource),
    [resource],
  );
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const path = RESOURCE_PATH[resource];
    if (!path) return;
    setLoading(true);
    api<Record<string, any>[]>(path)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [resource]);

  if (!config) return <div className="page">未找到屏配置：{resource}</div>;

  const columns = config.columns.map((c) => ({
    title: c.label,
    dataIndex: c.key,
    key: c.key,
    render: (v: any, row: Record<string, any>) => {
      if (c.kind === 'status') {
        if (c.key === 'status' && config.statusMap) {
          const hit = config.statusMap[String(v)];
          if (hit) return <Tag color={hit.color}>{hit.label}</Tag>;
        }
        return String(v ?? '');
      }
      if (c.kind === 'title-desc') {
        return (
          <div>
            <div className="cell-title">{row[c.key]}</div>
            {c.descKey && <div className="cell-desc">{row[c.descKey]}</div>}
          </div>
        );
      }
      return String(v ?? '');
    },
  }));

  if (config.rowActions.length) {
    columns.push({
      title: '操作',
      key: 'rowActions',
      render: (_: any, row: Record<string, any>) => (
        <Space>
          {config.rowActions.map((a) => (
            <a key={a} style={a === '删除' ? { color: '#FF4D4F' } : undefined}>{a}</a>
          ))}
        </Space>
      ),
    } as any);
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">{config.title}</div>
          {config.subtitle && <div className="page-subtitle">{config.subtitle}</div>}
        </div>
      </div>

      {config.stats && (
        <div className="kpi-strip">
          {config.stats.map((st) => (
            <Card key={st.key} size="small">
              <Statistic title={st.label} value={data.length} />
            </Card>
          ))}
        </div>
      )}

      <Card title={config.cardTitle || config.title}>
        <div className="list-toolbar">
          <Space wrap>
            {config.filters?.map((f) =>
              f.type === 'search' ? (
                <Input.Search
                  key={f.key}
                  placeholder={f.placeholder}
                  style={{ width: 240 }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              ) : (
                <Select key={f.key} style={{ width: 140 }} placeholder={f.label} />
              ),
            )}
          </Space>
          <Space>
            {config.actions?.map((a) => (
              <Button key={a.label} type={a.variant === 'primary' ? 'primary' : 'default'}
                icon={a.variant === 'primary' ? <PlusOutlined /> : undefined}>
                {a.label}
              </Button>
            ))}
          </Space>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          columns={columns}
          pagination={config.pagination ? { showTotal: (t) => `共 ${t} 条记录` } : false}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
}