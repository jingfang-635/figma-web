import { Button, Card, Col, Form, Input, Row, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { fetchResourceList, updateResource } from '../api/client';
import organizationBlueprint from '../blueprints/organization.json';
import { KpiRow, PageHeaderBlock } from '../components/chrome/PageBlocks';
import { useStats } from '../components/chrome/StatsContext';
import { isVisualGate } from '../visual/gate';

const { TextArea } = Input;

export function OrganizationPage() {
  const bp = organizationBlueprint;
  const gate = isVisualGate();
  const stats = useStats();
  const [form] = Form.useForm();
  const [orgId, setOrgId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchResourceList('organizations')
      .then((res) => {
        if (cancelled) return;
        const first = (res.data ?? [])[0] as Record<string, unknown> | undefined;
        if (gate && bp.sample?.form) {
          form.setFieldsValue(bp.sample.form);
          if (first) setOrgId(Number(first.id));
          return;
        }
        if (!first) return;
        setOrgId(Number(first.id));
        form.setFieldsValue({
          name: first.name ?? '',
          phone: first.phone ?? '',
          subtitle: first.subtitle ?? '',
          email: first.email ?? '',
          businessHours: first.businessHours ?? '',
          address: first.address ?? '',
          description: first.description ?? '',
        });
      })
      .catch((err) => message.error(err instanceof Error ? err.message : '加载失败'));
    return () => {
      cancelled = true;
    };
  }, [form, gate, bp.sample]);

  const kpiItems = useMemo(
    () =>
      bp.kpiRow.map((k) => ({
        key: k.key,
        label: k.label,
        value: gate
          ? ((bp.sample as { kpi?: Record<string, number> } | undefined)?.kpi?.[k.key] ??
              (stats as unknown as Record<string, number>)[k.key] ??
              0)
          : ((stats as unknown as Record<string, number>)[k.key] ?? 0),
      })),
    [bp.kpiRow, bp.sample, gate, stats],
  );

  const save = async () => {
    if (orgId == null) return;
    const values = await form.validateFields();
    setSaving(true);
    try {
      await updateResource('organizations', orgId, values);
      message.success('机构信息已保存');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeaderBlock title={bp.pageHeader.title} subtitle={bp.pageHeader.subtitle} />
      <KpiRow items={kpiItems} />
      <Card
        className="org-card"
        title={
          <div>
            <div>{bp.formCard.title}</div>
            <div style={{ fontSize: 12, fontWeight: 400, color: '#8c8c8c', marginTop: 4 }}>
              {bp.formCard.subtitle}
            </div>
          </div>
        }
        extra={
          <Button type="primary" loading={saving} onClick={() => void save()}>
            {bp.formCard.primaryAction}
          </Button>
        }
      >
        <Form
          form={form}
          layout="horizontal"
          className="org-form"
          labelCol={{ flex: '77px' }}
          wrapperCol={{ flex: 1 }}
          labelAlign="right"
          colon={false}
          requiredMark={(label, info) =>
            info.required ? (
              <>
                {label}
                <span style={{ color: '#ff4d4f', marginLeft: 4 }}>*</span>
              </>
            ) : (
              label
            )
          }
        >
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item name="name" label="机构名称" rules={[{ required: true, message: '请输入机构名称' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="联系电话">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="subtitle" label="机构副标题">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="businessHours" label="营业时间">
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="address" label="机构地址">
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="机构简介">
                <TextArea rows={3} maxLength={1000} style={{ height: 80, resize: 'none' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
}
