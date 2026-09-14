# 可访问性检查清单

本文档提供 WCAG 2.1 AA 标准的可访问性检查清单和测试方法。

## WCAG 2.1 AA 标准

### 1. 可感知性 (Perceivable)

#### 1.1 文本替代

**所有非文本内容必须有文本替代**

- [ ] 信息性图片有 `alt` 属性
- [ ] 装饰性图片 `alt=""`（空字符串）
- [ ] 图标有 `aria-label` 或 `aria-labelledby`
- [ ] 表单按钮有可访问的标签
- [ ] 图表有文本描述或数据表

**示例**：

```html
<!-- ✅ 信息性图片 -->
<img src="/assets/dept-icon.png" alt="科室图标" />

<!-- ✅ 装饰性图片 -->
<img src="/decorative-border.png" alt="" />

<!-- ✅ 图标按钮 -->
<button aria-label="新增科室">
  <PlusIcon />
</button>

<!-- ❌ 错误：缺少替代文本 -->
<img src="/assets/dept-icon.png" />
<button><PlusIcon /></button>
```

---

#### 1.2 时间可调节媒体

**音频和视频内容必须有替代方案**

- [ ] 视频有字幕
- [ ] 视频有音频描述
- [ ] 纯音频内容有文本记录

---

#### 1.3 可适应性

**内容可以用不同方式呈现而不丢失信息**

- [ ] 页面结构使用语义化 HTML（`<header>`, `<nav>`, `<main>`, `<footer>`）
- [ ] 表格有 `<caption>` 和正确的 `scope`
- [ ] 列表使用正确的 `<ul>`, `<ol>`, `<dl>`
- [ ] 表单字段有关联的 `<label>`
- [ ] 错误信息关联到表单字段（`aria-describedby`）
- [ ] 数据图表有替代的数据表

**示例**：

```html
<!-- ✅ 语义化结构 -->
<header>...</header>
<nav aria-label="主导航">...</nav>
<main>...</main>
<footer>...</footer>

<!-- ✅ 表格 -->
<table>
  <caption>科室列表</caption>
  <thead>
    <tr>
      <th scope="col">科室名称</th>
      <th scope="col">医生数量</th>
    </tr>
  </thead>
  <tbody>...</tbody>
</table>

<!-- ✅ 表单 -->
<label for="dept-name">科室名称</label>
<input 
  type="text" 
  id="dept-name" 
  aria-describedby="dept-name-help"
  aria-required="true"
  aria-invalid="false"
/>
<span id="dept-name-help">最多可提前 N 天预约</span>
```

---

#### 1.4 可辨别性

**内容易于观看和聆听**

##### 1.4.1 颜色使用

**颜色不是传达信息的唯一方式**

- [ ] 状态不仅用颜色表示（如成功/失败）
- [ ] 链接不仅用颜色区分（有下划线或其他标识）
- [ ] 图表使用颜色 + 图案/标签

**示例**：

```html
<!-- ❌ 错误：只用颜色表示状态 -->
<span style="color: red">失败</span>
<span style="color: green">成功</span>

<!-- ✅ 正确：颜色 + 图标 -->
<span style="color: red">❌ 失败</span>
<span style="color: green">✅ 成功</span>

<!-- ✅ 更好：颜色 + 图标 + 文本 -->
<span role="status" aria-live="polite">
  <span class="icon-error" aria-hidden="true"></span>
  提交失败，请重试
</span>
```

##### 1.4.3 对比度（最低）

**文本和背景的对比度至少 4.5:1**

- [ ] 正文文本对比度 ≥ 4.5:1
- [ ] 大字号（18px+ 或 14px+ 粗体）对比度 ≥ 3:1
- [ ] UI 组件（按钮、图标）对比度 ≥ 3:1
- [ ] 占位符文本对比度 ≥ 4.5:1

**检查工具**：
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)

**示例**：

```css
/* ❌ 错误：对比度 3.2:1 */
.text-muted {
  color: #999999;
  background-color: #ffffff;
}

/* ✅ 正确：对比度 5.8:1 */
.text-muted {
  color: #757575;
  background-color: #ffffff;
}

/* ✅ 更好：使用 CSS 变量 */
:root {
  --text-primary: #262626;    /* 对比度 16.1:1 */
  --text-secondary: #595959;  /* 对比度 8.0:1 */
  --text-tertiary: #8C8C8C;   /* 对比度 4.6:1 */
}
```

##### 1.4.10 重排

**内容可以在不丢失信息的情况下重排**

- [ ] 页面在 320px 宽度下可用
- [ ] 不需要水平滚动
- [ ] 响应式布局正确实现

---

### 2. 可操作性 (Operable)

#### 2.1 键盘可访问

**所有功能可通过键盘操作**

- [ ] 所有交互元素可 Tab 到达
- [ ] Tab 顺序合理（从左到右、从上到下）
- [ ] 无键盘陷阱（可 Tab 移出）
- [ ] 自定义组件支持键盘导航（Arrow keys, Enter, Escape）
- [ ] 模态框聚焦循环（Focus Trap）
- [ ] 跳过导航链接（Skip to main content）

**示例**：

```html
<!-- ✅ 跳过导航 -->
<a href="#main-content" class="skip-link">
  跳到主要内容
</a>

<main id="main-content">...</main>

<!-- ✅ 模态框聚焦循环 -->
<div 
  role="dialog" 
  aria-modal="true"
  aria-labelledby="modal-title"
>
  <h2 id="modal-title">新增科室</h2>
  <!-- 模态框内容 -->
  <!-- 焦点应在此范围内循环 -->
</div>
```

```tsx
// ✅ 自定义组件键盘支持
function CustomDropdown({ items }) {
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        toggleDropdown();
        break;
      case 'Escape':
        closeDropdown();
        break;
      case 'ArrowDown':
        e.preventDefault();
        focusNextItem();
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusPreviousItem();
        break;
    }
  };
  
  return (
    <div 
      role="combobox" 
      tabIndex={0} 
      onKeyDown={handleKeyDown}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
    >
      {/* 下拉内容 */}
    </div>
  );
}
```

---

#### 2.2 足够的时间

**用户有足够的时间阅读和使用内容**

- [ ] 无自动刷新（或提供暂停/关闭选项）
- [ ] 无时间限制（或提供延长选项）
- [ ] 会话超时前有警告和延长选项

---

#### 2.3 癫痫和身体反应

**内容不会引起癫痫发作**

- [ ] 无闪烁内容（< 3 次/秒）
- [ ] 无自动播放动画（或提供暂停选项）

---

#### 2.4 可导航性

**帮助用户导航和查找内容**

- [ ] 页面有唯一的 `<title>`
- [ ] 页面语言正确设置（`<html lang="zh-CN">`）
- [ ] 导航有 `aria-label`
- [ ] 面包屑导航正确实现
- [ ] 焦点状态可见（`:focus-visible`）
- [ ] 链接文本有意义（避免"点击这里"）

**示例**：

```html
<!-- ✅ 页面标题 -->
<title>科室管理 - 阳光医疗</title>

<!-- ✅ 页面语言 -->
<html lang="zh-CN">

<!-- ✅ 有意义的链接 -->
<a href="/departments/1">查看内科详情</a>

<!-- ❌ 错误：无意义链接 -->
<a href="/departments/1">点击这里</a>

<!-- ✅ 焦点状态 -->
<style>
.button:focus-visible {
  outline: 2px solid #1890FF;
  outline-offset: 2px;
}
</style>
```

---

### 3. 可理解性 (Understandable)

#### 3.1 可读性

**内容易于阅读和理解**

- [ ] 页面语言正确声明
- [ ] 专业术语有解释
- [ ] 缩写有完整形式

---

#### 3.2 可预测性

**页面行为可预测**

- [ ] 导航元素在多个页面中一致
- [ ] 相同功能的组件行为一致
- [ ] 表单提交前可检查输入
- [ ] 错误信息清晰并指导修正

**示例**：

```tsx
// ✅ 清晰的错误信息
<Form.Item
  label="邮箱"
  name="email"
  rules={[
    { 
      type: 'email', 
      message: '请输入有效的邮箱地址，例如 name@example.com' 
    }
  ]}
>
  <Input />
</Form.Item>

// ❌ 模糊的错误信息
<Form.Item
  label="邮箱"
  name="email"
  rules={[{ type: 'email', message: '无效' }]}
>
```

---

#### 3.3 输入辅助

**帮助用户避免和纠正错误**

- [ ] 表单字段有清晰的标签
- [ ] 必填字段有标识（`aria-required`）
- [ ] 输入格式有说明（placeholder 或 hint）
- [ ] 错误信息关联到字段（`aria-describedby`）
- [ ] 提交前可检查和修正

**示例**：

```tsx
// ✅ 完整的表单辅助
<Form.Item
  label="手机号"
  name="phone"
  required
  extra="格式：11 位中国大陆手机号，例如 13800138000"
>
  <Input 
    placeholder="请输入手机号"
    aria-required="true"
    aria-describedby="phone-help"
    aria-invalid={!!errors.phone}
  />
</Form.Item>
<span id="phone-help" className="form-help">
  患者最多可提前 N 天预约
</span>
{errors.phone && (
  <span role="alert" className="error-message">
    {errors.phone.message}
  </span>
)}
```

---

### 4. 可靠性 (Robust)

#### 4.1 兼容

**与辅助技术兼容**

- [ ] 使用有效的 HTML
- [ ] ARIA 使用正确（role, state, property）
- [ ] 自定义组件有完整的 ARIA 支持
- [ ] 状态变化通过 `aria-live` 通知

**示例**：

```tsx
// ✅ 完整的 ARIA 支持
function Modal({ isOpen, title, children }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-hidden={!isOpen}
    >
      <h2 id="modal-title">{title}</h2>
      {children}
    </div>
  );
}

// ✅ 状态变化通知
function SubmissionStatus({ status }) {
  return (
    <div role="status" aria-live="polite">
      {status === 'submitting' && '正在提交...'}
      {status === 'success' && '✅ 提交成功'}
      {status === 'error' && '❌ 提交失败，请重试'}
    </div>
  );
}
```

---

## 自动检查

### 运行可访问性检查

```bash
# 安装依赖
npm install -D @axe-core/playwright --prefix apps/web

# 运行检查
npm run a11y:check
```

### 检查脚本

```javascript
// scripts/a11y-check.mjs
import { AxePuppeteer } from '@axe-core/puppeteer';
import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'fs';

const pages = [
  { name: '首页', url: 'http://localhost:5173/' },
  { name: '科室管理', url: 'http://localhost:5173/departments' },
  { name: '机构信息', url: 'http://localhost:5173/organization' },
  { name: '排班管理', url: 'http://localhost:5173/schedules' },
  { name: '新增预约', url: 'http://localhost:5173/appointments/new' }
];

const browser = await puppeteer.launch({ headless: true });
const allViolations = [];

console.log('🔍 开始可访问性检查...\n');

for (const page of pages) {
  console.log(`📄 检查：${page.name}`);
  
  const browserPage = await browser.newPage();
  await browserPage.goto(page.url, { waitUntil: 'networkidle0' });
  
  const results = await new AxePuppeteer(browserPage).analyze();
  
  console.log(`   违规数：${results.violations.length}`);
  console.log(`   警告数：${results.incomplete.length}`);
  
  if (results.violations.length > 0) {
    for (const violation of results.violations) {
      console.log(`   🔴 ${violation.id}: ${violation.description}`);
      console.log(`      影响节点：${violation.nodes.length} 个`);
      console.log(`      帮助：${violation.helpUrl}\n`);
    }
    
    allViolations.push({
      page: page.name,
      url: page.url,
      violations: results.violations
    });
  } else {
    console.log(`   ✅ 通过\n`);
  }
  
  await browserPage.close();
}

await browser.close();

// 生成报告
mkdirSync('artifacts/accessibility', { recursive: true });
writeFileSync(
  'artifacts/accessibility/violations.json',
  JSON.stringify({
    timestamp: new Date().toISOString(),
    totalPages: pages.length,
    pagesWithViolations: allViolations.length,
    violations: allViolations
  }, null, 2)
);

console.log('='.repeat(60));
console.log(`📊 检查完成：${pages.length - allViolations.length}/${pages.length} 页面通过`);

if (allViolations.length > 0) {
  console.log(`🔴 发现 ${allViolations.length} 页面有可访问性问题`);
  console.log(`📄 详细报告：artifacts/accessibility/violations.json`);
  process.exit(1);
} else {
  console.log('✅ 所有页面通过 WCAG AA 检查\n');
}
```

---

## 手动检查

### 仅键盘导航测试

1. 按 `Tab` 键遍历整个页面
2. 确认焦点顺序合理（从左到右、从上到下）
3. 确认所有交互元素可到达
4. 确认焦点状态可见
5. 尝试按 `Escape` 关闭模态框
6. 确认无键盘陷阱

### 屏幕阅读器测试

**推荐工具**：
- Windows: [NVDA](https://www.nvaccess.org/)（免费）
- macOS: VoiceOver（内置，按 `Cmd+Option+F5` 启用）
- Chrome: [ChromeVox](https://chrome.google.com/webstore)（扩展）

**测试步骤**：
1. 启用屏幕阅读器
2. 闭上眼睛，仅听声音导航
3. 确认所有信息可通过语音获取
4. 确认图片有 alt 文本朗读
5. 确认表单有标签朗读
6. 确认错误信息可听到

### 颜色对比度检查

使用工具检查所有文本对比度：
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)

---

## 常见问题修复

### 问题 1：颜色对比度不足

**修复前**：
```css
.text-muted {
  color: #999; /* 对比度 3.2:1 */
}
```

**修复后**：
```css
.text-muted {
  color: #757575; /* 对比度 5.8:1 */
}
```

---

### 问题 2：表单缺少标签

**修复前**：
```html
<input type="text" id="name" placeholder="姓名" />
```

**修复后**：
```html
<label for="name">姓名</label>
<input type="text" id="name" aria-required="true" />
```

---

### 问题 3：焦点状态不可见

**修复前**：
```css
/* 无焦点样式 */
```

**修复后**：
```css
.button:focus-visible {
  outline: 2px solid #1890FF;
  outline-offset: 2px;
}

input:focus-visible {
  border-color: #1890FF;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}
```

---

### 问题 4：模态框无聚焦循环

**修复前**：
```tsx
// 焦点可 Tab 出模态框
<div className="modal">...</div>
```

**修复后**：
```tsx
import { FocusTrap } from '@headlessui/react';

function Modal({ children }) {
  return (
    <FocusTrap>
      <div 
        role="dialog" 
        aria-modal="true"
        className="modal"
      >
        {children}
      </div>
    </FocusTrap>
  );
}
```

---

## 验收标准

| 检查项 | 要求 | 测量方法 |
|---|---|---|
| **自动检查** | WCAG AA 违规数 = 0 | `npm run a11y:check` |
| **颜色对比度** | 所有文本 ≥ 4.5:1 | WebAIM Contrast Checker |
| **键盘导航** | 所有功能可用键盘操作 | 手动 Tab 测试 |
| **屏幕阅读器** | 所有信息可朗读 | NVDA/VoiceOver 测试 |
| **焦点可见性** | 所有交互元素有可见焦点 | 手动 Tab 测试 |

---

## 相关文档

- [FIGMA_TOKEN_SETUP.md](./FIGMA_TOKEN_SETUP.md) - Figma Token 配置
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 故障排查手册
- [PERFORMANCE_BENCHMARK.md](./PERFORMANCE_BENCHMARK.md) - 性能基线标准
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 生产环境部署指南
- [VISUAL_REDUCTION_ROUNDS.md](./VISUAL_REDUCTION_ROUNDS.md) - 视觉还原轮次流程
