#!/usr/bin/env node
/**
 * Merge Layout IR geometry into Screen Blueprints and copy to apps/web/src/blueprints.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const slug = "sunshine-medical";
const srcDir = resolve(root, "fixtures", slug, "screen-blueprints");
const layoutDir = resolve(root, "fixtures", slug, "layout-ir");
const webDir = resolve(root, "apps/web/src/blueprints");
mkdirSync(srcDir, { recursive: true });
mkdirSync(webDir, { recursive: true });

function loadLayout(id) {
  const p = resolve(layoutDir, `${id}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

function regionMap(layout) {
  const map = {};
  for (const r of layout?.regions || []) {
    map[r.id] = r;
  }
  return map;
}

function layoutBlock(layout, extra = {}) {
  if (!layout) return extra;
  return {
    viewport: layout.frame,
    regions: (layout.regions || []).map((r) => ({
      id: r.id,
      nodeId: r.nodeId,
      padding: r.padding,
      gap: r.gap,
      width: r.box?.w,
      height: r.box?.h || r.height,
      font: r.font,
      color: r.color || r.font?.color,
      fill: r.fill,
    })),
    ...extra,
  };
}

function sampleFromTexts(texts = []) {
  const nums = texts
    .map((t) => String(t).replace(/,/g, ""))
    .filter((t) => /^\d+(\.\d+)?%?$/.test(t) || /^¥/.test(t));
  return nums.slice(0, 12);
}

const homeLayout = loadLayout("home");
const deptLayout = loadLayout("departments");
const orgLayout = loadLayout("organization");
const schLayout = loadLayout("schedules");

const home = {
  route: "/",
  refShot: "imports/figma/screens/首页.png",
  pageHeader: {
    title: "首页",
    subtitle: "预约数据、就诊数据与收入的运营分析",
  },
  kpiRow: [
    { key: "monthAppointments", label: "本月预约量" },
    { key: "visitRate", label: "就诊率", format: "percent" },
    { key: "noShowRate", label: "爽约率", format: "percent" },
    { key: "monthIncome", label: "本月收入", format: "currency" },
  ],
  charts: [
    { id: "trend", title: "📈 近7天预约量趋势", type: "line", color: "#1890FF" },
    { id: "deptBars", title: "🥧 近7天各科室预约量", type: "bar", color: "#1890FF" },
    { id: "income", title: "💰 近7天挂号收入", type: "line", color: "#52C41A" },
    { id: "metrics", title: "📊 关键指标", type: "metrics" },
  ],
  layout: layoutBlock(homeLayout),
  sample: {
    kpi: {
      monthAppointments: 106,
      visitRate: 96.2,
      noShowRate: 3.8,
      monthIncome: 5280,
    },
    trend: [
      { label: "8/1", value: 12 },
      { label: "8/2", value: 8 },
      { label: "8/3", value: 15 },
      { label: "8/4", value: 10 },
      { label: "8/5", value: 18 },
      { label: "8/6", value: 22 },
      { label: "今日", value: 5 },
    ],
    deptBars: [
      { label: "内科", value: 38 },
      { label: "妇科", value: 25 },
      { label: "儿科", value: 20 },
      { label: "口腔科", value: 15 },
      { label: "皮肤科", value: 8 },
    ],
    income: [
      { label: "8/1", value: 360 },
      { label: "8/2", value: 240 },
      { label: "8/3", value: 450 },
      { label: "8/4", value: 300 },
      { label: "8/5", value: 540 },
      { label: "8/6", value: 660 },
      { label: "今日", value: 150 },
    ],
    figmaTexts: sampleFromTexts(homeLayout?.texts),
  },
};

const departments = {
  route: "/departments",
  refShot: "imports/figma/screens/科室管理.png",
  pageHeader: {
    title: "科室管理",
    subtitle: "管理门诊基础资料、排班与预约信息",
  },
  kpiRow: [
    { key: "departments", label: "启用科室" },
    { key: "doctors", label: "在诊医生" },
    { key: "pendingAppointments", label: "待就诊" },
    { key: "todayAppointments", label: "今日订单" },
  ],
  listCard: {
    title: "科室列表",
    subtitle: "维护小程序展示的科室名称、说明和图标",
    primaryAction: "+ 新增科室",
    resource: "departments",
    columns: [
      { key: "dept", title: "科室", variant: "iconTitleDesc", nameField: "name", descField: "description" },
      { key: "doctorCount", title: "医生数量", variant: "doctorCount" },
      { key: "sortOrder", title: "排序", variant: "text" },
      { key: "status", title: "状态", variant: "tag" },
      { key: "actions", title: "操作", variant: "iconEditDelete" },
    ],
  },
  modal: {
    id: "create-department",
    title: "新增科室",
    layout: "horizontal",
    extra: ["iconUpload"],
    width: 520,
    fields: [
      { key: "name", label: "科室名称", type: "text", required: true },
      { key: "icon", label: "科室图标", type: "upload", required: true },
      { key: "description", label: "科室描述", type: "textarea" },
      { key: "sortOrder", label: "排序", type: "number" },
      { key: "status", label: "状态", type: "select", options: [
        { value: "active", label: "启用" },
        { value: "inactive", label: "停用" },
      ]},
    ],
  },
  layout: layoutBlock(deptLayout, { modal: regionMap(loadLayout("modal-create-dept")).modal }),
  sample: {
    kpi: {
      departments: 6,
      doctors: 6,
      pendingAppointments: 0,
      todayAppointments: 0,
    },
    rows: [
      { id: 1, name: "内科", description: "重症、发热、咳嗽等", sortOrder: 1, status: "active", _count: { doctors: 1 } },
      { id: 2, name: "儿科", description: "儿童保健、常见疾病", sortOrder: 2, status: "active", _count: { doctors: 1 } },
      { id: 3, name: "妇科", description: "妇科炎症、月经不调", sortOrder: 3, status: "active", _count: { doctors: 1 } },
      { id: 4, name: "口腔科", description: "牙痛、龋齿、牙周炎", sortOrder: 4, status: "active", _count: { doctors: 1 } },
      { id: 5, name: "皮肤科", description: "皮炎、湿疹、过敏等", sortOrder: 5, status: "active", _count: { doctors: 1 } },
    ],
  },
};

const organization = {
  route: "/organization",
  refShot: "imports/figma/screens/机构信息.png",
  pageHeader: {
    title: "机构信息",
    subtitle: "管理门诊基础资料、排班与预约信息",
  },
  kpiRow: [
    { key: "departments", label: "启用科室" },
    { key: "doctors", label: "在诊医生" },
    { key: "pendingAppointments", label: "待就诊" },
    { key: "todayAppointments", label: "今日订单" },
  ],
  formCard: {
    title: "机构基础信息",
    subtitle: "小程序首页、预约详情和后台使用同一份机构资料",
    primaryAction: "保存机构信息",
    resource: "organizations",
    layout: "twoColumn",
    fields: [
      { key: "name", label: "机构名称", type: "text", required: true, span: 12 },
      { key: "phone", label: "联系电话", type: "text", span: 12 },
      { key: "subtitle", label: "机构副标题", type: "text", span: 12 },
      { key: "businessHours", label: "营业时间", type: "text", span: 12 },
      { key: "address", label: "机构地址", type: "text", span: 24 },
      { key: "description", label: "机构简介", type: "textarea", span: 24, maxLength: 1000 },
    ],
  },
  layout: layoutBlock(orgLayout),
  sample: {
    kpi: {
      departments: 6,
      doctors: 6,
      pendingAppointments: 0,
      todayAppointments: 0,
    },
    form: {
      name: "阳光医疗门诊",
      phone: "010-8888 8888",
      subtitle: "以患者为中心 · 专业守护健康",
      businessHours: "周一至周日 08:00-17:30",
      address: "北京市示范区健康路 88 号",
      description: "正规医疗机构，拥有专业医疗团队，为患者提供贴心、便捷的门诊服务。",
    },
  },
};

const schedules = {
  route: "/schedules",
  refShot: "imports/figma/screens/排班管理.png",
  pageHeader: {
    title: "排班管理",
    subtitle: "管理医生出诊时间表，支持单日/批量排班，用户端根据排班展示可预约时段",
  },
  kpiRow: [
    { key: "departments", label: "启用科室" },
    { key: "doctors", label: "在诊医生" },
    { key: "pendingAppointments", label: "待就诊" },
    { key: "todayAppointments", label: "今日订单" },
  ],
  calendar: {
    filters: ["department", "doctor"],
    views: ["calendar", "list"],
    legend: [
      { color: "#1890FF", label: "可预约" },
      { color: "#FA8C16", label: "已约满" },
      { color: "#FF4D4F", label: "停诊" },
      { color: "#13C2C2", label: "上午" },
      { color: "#EB2F96", label: "下午" },
    ],
    actions: ["批量排班", "＋ 新增排班"],
  },
  layout: layoutBlock(schLayout),
  sample: {
    kpi: {
      departments: 6,
      doctors: 6,
      pendingAppointments: 0,
      todayAppointments: 0,
    },
    cursor: "2026-08-01",
    rows: [
      { id: 1, date: "2026-08-10", startTime: "08:00", endTime: "12:00", quota: 30, booked: 12, status: "available", tone: "morning", doctor: { name: "张伟" } },
      { id: 2, date: "2026-08-10", startTime: "08:00", endTime: "12:00", quota: 20, booked: 20, status: "full", tone: "full", doctor: { name: "张伟" } },
      { id: 3, date: "2026-08-10", startTime: "14:00", endTime: "17:00", quota: 40, booked: 15, status: "available", tone: "available", doctor: { name: "李娜" } },
      { id: 4, date: "2026-08-10", startTime: "08:00", endTime: "12:00", quota: 10, booked: 1, status: "available", doctor: { name: "hidden" } },
      { id: 5, date: "2026-08-10", startTime: "08:00", endTime: "12:00", quota: 10, booked: 1, status: "available", doctor: { name: "hidden" } },
      { id: 6, date: "2026-08-10", startTime: "08:00", endTime: "12:00", quota: 10, booked: 1, status: "available", doctor: { name: "hidden" } },
      { id: 7, date: "2026-08-10", startTime: "08:00", endTime: "12:00", quota: 10, booked: 1, status: "available", doctor: { name: "hidden" } },
      { id: 8, date: "2026-08-11", startTime: "08:00", endTime: "12:00", quota: 25, booked: 5, status: "available", tone: "morning", doctor: { name: "王磊" } },
      { id: 9, date: "2026-08-11", startTime: "08:00", endTime: "12:00", quota: 20, booked: 8, status: "available", tone: "morning", doctor: { name: "李娜" } },
      { id: 10, date: "2026-08-11", startTime: "14:00", endTime: "17:00", quota: 30, booked: 10, status: "available", tone: "available", doctor: { name: "陈静" } },
      { id: 11, date: "2026-08-12", startTime: "08:00", endTime: "12:00", quota: 20, booked: 0, status: "available", tone: "morning", doctor: { name: "刘洋" } },
      { id: 12, date: "2026-08-12", startTime: "14:00", endTime: "17:00", quota: 15, booked: 7, status: "available", tone: "afternoon", doctor: { name: "赵强" } },
      { id: 13, date: "2026-08-14", startTime: "14:00", endTime: "17:00", quota: 50, booked: 30, status: "available", tone: "available", doctor: { name: "张伟" } },
    ],
  },
};

const doctors = {
  route: "/doctors",
  refShot: "imports/figma/screens/医生管理.png",
  pageHeader: {
    title: "医生管理",
    subtitle: "管理门诊基础资料、排班与预约信息",
  },
  kpiRow: [
    { key: "departments", label: "启用科室" },
    { key: "doctors", label: "在诊医生" },
    { key: "pendingAppointments", label: "待就诊" },
    { key: "todayAppointments", label: "今日订单" },
  ],
  listCard: {
    title: "医生列表",
    subtitle: "挂号费按医生配置，医生停用后用户端不再展示",
    primaryAction: "+ 新增医生",
    searchPlaceholder: "搜索医生、科室或擅长",
    departmentFilter: "全部科室",
    resource: "doctors",
    columns: [
      { key: "doctor", title: "医生", variant: "avatarTitleDesc" },
      { key: "department", title: "科室", variant: "deptTag" },
      { key: "specialty", title: "擅长", variant: "ellipsis" },
      { key: "experience", title: "经验/好评", variant: "expRate" },
      { key: "fee", title: "挂号费", variant: "fee" },
      { key: "status", title: "状态", variant: "tag" },
      { key: "actions", title: "操作", variant: "iconEditDelete" },
    ],
  },
  modal: {
    id: "create-doctor",
    title: "新增医生",
    layout: "horizontal",
    extra: ["avatarUpload"],
    width: 520,
    height: 717,
    fields: [
      { key: "avatar", label: "医生头像", type: "upload" },
      { key: "name", label: "医生姓名", type: "text", required: true, placeholder: "请输入姓名" },
      { key: "title", label: "职称", type: "text", required: true },
      { key: "departmentId", label: "所属科室", type: "select", required: true },
      { key: "fee", label: "挂号费(¥)", type: "number", required: true },
      { key: "experienceYears", label: "从业年限", type: "number" },
      { key: "goodRate", label: "好评率(%)", type: "number" },
      { key: "specialty", label: "擅长领域", type: "textarea", placeholder: "逗号分隔" },
      { key: "status", label: "状态", type: "select", options: [
        { value: "active", label: "在诊" },
        { value: "inactive", label: "停诊" },
      ] },
    ],
  },
  sample: {
    kpi: {
      departments: 6,
      doctors: 6,
      pendingAppointments: 0,
      todayAppointments: 0,
    },
    rows: [
      { id: 1, name: "张伟", title: "副主任医师", departmentId: 1, department: { id: 1, name: "内科" }, specialty: "高血压、糖尿病、冠心病等慢性病...", experienceYears: 15, goodRate: 99, fee: 30, status: "active" },
      { id: 2, name: "李娜", title: "主任医师 副教授", departmentId: 3, department: { id: 3, name: "妇科" }, specialty: "妇科炎症、月经不调、宫颈疾病、...", experienceYears: 16, goodRate: 99, fee: 30, status: "active" },
      { id: 3, name: "王磊", title: "主治医师", departmentId: 2, department: { id: 2, name: "儿科" }, specialty: "儿童感冒、咳嗽、发热等常见病", experienceYears: 10, goodRate: 98, fee: 25, status: "active" },
      { id: 4, name: "王磊", title: "主治医师", departmentId: 4, department: { id: 4, name: "口腔科" }, specialty: "牙体牙髓、牙周疾病", experienceYears: 9, goodRate: 98, fee: 35, status: "active" },
    ],
  },
};

const files = { home, departments, organization, schedules, doctors };
for (const [name, data] of Object.entries(files)) {
  const json = JSON.stringify(data, null, 2) + "\n";
  writeFileSync(resolve(srcDir, `${name}.json`), json, "utf8");
  writeFileSync(resolve(webDir, `${name}.json`), json, "utf8");
  console.log("Wrote", `${name}.json`);
}
