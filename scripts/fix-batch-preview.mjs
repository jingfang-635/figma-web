import { readFileSync, writeFileSync } from 'node:fs';

const file = 'apps/web/src/pages/SchedulePage.tsx';
let t = readFileSync(file, 'utf8');

// 1) 加 Form.useWatch 以便预览区随表单联动
const anchor = "const { message } = App.useApp();";
if (!t.includes('batchDoctorIds')) {
  t = t.replace(
    anchor,
    anchor +
      "\n  const batchDoctorIds = Form.useWatch('doctorIds', batchForm);" +
      "\n  const batchWeekdays = Form.useWatch('weekdays', batchForm);" +
      "\n  const batchSlot = Form.useWatch('slot', batchForm);"
  );
}

// 2) 用标记切片替换静态预览块（gate 模式保留 8 月静态文案以对齐 Figma）
const startMarker = '<div className="batch-preview">';
const endMarker = '</Form>';
const si = t.indexOf(startMarker);
const ei = t.indexOf(endMarker, si);
if (si < 0 || ei < 0) {
  console.error('markers not found', { si, ei });
  process.exit(1);
}
const replacement = `<div className="batch-preview">
            <div className="batch-preview-title">生成预览：</div>
            {gate ? (
              <>
                <div>2026-08-09 — 张伟、李娜、王磊、陈静、刘洋、赵强（上午）</div>
                <div>2026-08-10 — 张伟、李娜、王磊、陈静、刘洋、赵强（上午）</div>
                <div>2026-08-11 — 张伟、李娜、王磊、陈静、刘洋、赵强（上午）</div>
                <div>2026-08-12 — 张伟、李娜、王磊、陈静、刘洋、赵强（上午）</div>
                <div>2026-08-13 — 张伟、李娜、王磊、陈静、刘洋、赵强（上午）</div>
                <div className="batch-preview-note">预计生成 30 条排班记录（6 位医生 × 5 天）</div>
              </>
            ) : (() => {
              const ids = batchDoctorIds || [];
              if (!ids.length) return <div className="batch-preview-note">选择医生与日期后自动生成预览</div>;
              const docNames = ids.map((id: string) => doctorOpts.find((d) => d.value === String(id))?.label || \`医生\${id}\`);
              const dateMap: Record<string, number> = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };
              const base = dayjs(\`\${month}-01\`);
              const dates: string[] = [];
              for (let d = 1; d <= base.daysInMonth() && dates.length < 5; d++) {
                const dow = base.date(d).day();
                if ((batchWeekdays || []).some((w: string) => dateMap[w] === dow)) dates.push(base.date(d).format('YYYY-MM-DD'));
              }
              const slotName = batchSlot === 'pm' ? '下午' : '上午';
              return (
                <>
                  {dates.map((dt) => <div key={dt}>{dt} — {docNames.join('、')}（{slotName}）</div>)}
                  <div className="batch-preview-note">预计生成 {docNames.length * dates.length} 条排班记录（{docNames.length} 位医生 × {dates.length} 天）</div>
                </>
              );
            })()}
          </div>
        `;
t = t.slice(0, si) + replacement + t.slice(ei);
writeFileSync(file, t);
console.log('batch preview replaced OK');