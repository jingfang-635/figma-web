/* Generated from Visual IR. Re-run: node scripts/generate-screen-configs.mjs */
export type TemplateKind = 'dashboard' | 'list' | 'form' | 'schedule' | 'content';
export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'date' | 'password' | 'boolean';
export type ColumnKind = 'text' | 'status' | 'datetime' | 'relation' | 'boolean' | 'title-desc';

export interface SelectOption {
  value: string;
  label: string;
}

export interface ColumnConfig {
  key: string;
  label: string;
  kind?: ColumnKind;
  relationLabel?: string;
  descKey?: string;
}

export interface FormFieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: SelectOption[];
  relatedResource?: string;
  relatedLabelKey?: string;
  hint?: string;
}

export interface FilterConfig {
  key: string;
  type: 'search' | 'select';
  placeholder?: string;
  label?: string;
  options?: SelectOption[];
}

export interface ScreenAction {
  label: string;
  variant?: 'primary' | 'secondary';
  modal?: string;
}

export interface ScreenSection {
  title: string;
  resource: string;
  columns: ColumnConfig[];
  rowActions: string[];
  pagination: boolean;
  statusMap?: Record<string, { label: string; color?: string }>;
}

export interface ScreenConfig {
  name: string;
  nodeId?: string;
  route: string;
  template: TemplateKind;
  resource?: string;
  needsReview?: boolean;
  title: string;
  subtitle?: string;
  cardTitle?: string;
  cardSubtitle?: string;
  formCard?: { title?: string; primaryAction?: string };
  filters: FilterConfig[];
  actions: ScreenAction[];
  columns: ColumnConfig[];
  formFields: FormFieldConfig[];
  rowActions: string[];
  pagination: boolean;
  readOnly?: boolean;
  stats?: Array<{ key: string; label: string }>;
  statusMap?: Record<string, { label: string; color?: string }>;
  sections?: ScreenSection[];
}

export const screenConfigs: ScreenConfig[] = [
  {
    "name": "首页",
    "nodeId": "157:2",
    "route": "/",
    "template": "dashboard",
    "needsReview": false,
    "title": "首页",
    "subtitle": "预约数据、就诊数据与收入的运营分析",
    "filters": [],
    "actions": [],
    "columns": [],
    "formFields": [],
    "rowActions": [],
    "pagination": false,
    "readOnly": false,
    "stats": [
      {
        "key": "monthAppointments",
        "label": "本月预约量"
      },
      {
        "key": "visitRate",
        "label": "就诊率"
      },
      {
        "key": "noShowRate",
        "label": "爽约率"
      },
      {
        "key": "monthIncome",
        "label": "本月收入"
      }
    ],
    "sections": []
  },
  {
    "name": "机构信息",
    "nodeId": "157:203",
    "route": "/organization",
    "template": "form",
    "resource": "organizations",
    "needsReview": false,
    "title": "机构信息",
    "subtitle": "管理门诊基础资料、排班与预约信息",
    "filters": [],
    "actions": [
      {
        "label": "保存机构信息",
        "variant": "primary"
      }
    ],
    "columns": [],
    "formFields": [
      {
        "key": "name",
        "label": "机构名称",
        "type": "text",
        "required": true
      },
      {
        "key": "phone",
        "label": "联系电话",
        "type": "text"
      },
      {
        "key": "subtitle",
        "label": "机构副标题",
        "type": "text"
      },
      {
        "key": "businessHours",
        "label": "营业时间",
        "type": "text"
      },
      {
        "key": "address",
        "label": "机构地址",
        "type": "textarea"
      },
      {
        "key": "description",
        "label": "机构简介",
        "type": "textarea"
      }
    ],
    "rowActions": [],
    "pagination": false,
    "readOnly": false,
    "sections": []
  },
  {
    "name": "科室管理",
    "nodeId": "157:312",
    "route": "/departments",
    "template": "list",
    "resource": "departments",
    "needsReview": false,
    "title": "科室管理",
    "subtitle": "管理门诊基础资料、排班与预约信息",
    "filters": [
      {
        "key": "search",
        "type": "search",
        "placeholder": "搜索科室"
      }
    ],
    "actions": [
      {
        "label": "＋ 新增科室",
        "variant": "primary"
      }
    ],
    "columns": [
      {
        "key": "name",
        "label": "科室",
        "kind": "title-desc",
        "descKey": "description"
      },
      {
        "key": "doctorCount",
        "label": "医生数量"
      },
      {
        "key": "sortOrder",
        "label": "排序"
      },
      {
        "key": "status",
        "label": "状态",
        "kind": "status"
      }
    ],
    "formFields": [
      {
        "key": "name",
        "label": "科室名称",
        "type": "text",
        "required": true
      },
      {
        "key": "icon",
        "label": "科室图标",
        "type": "text",
        "required": true
      },
      {
        "key": "description",
        "label": "科室描述",
        "type": "textarea"
      },
      {
        "key": "sortOrder",
        "label": "排序",
        "type": "number"
      },
      {
        "key": "status",
        "label": "状态",
        "type": "select",
        "options": [
          {
            "value": "active",
            "label": "启用"
          },
          {
            "value": "inactive",
            "label": "停用"
          }
        ]
      }
    ],
    "rowActions": [
      "edit",
      "delete"
    ],
    "pagination": true,
    "readOnly": false,
    "stats": [
      {
        "key": "departments",
        "label": "启用科室"
      },
      {
        "key": "doctors",
        "label": "在诊医生"
      },
      {
        "key": "pendingAppointments",
        "label": "待就诊"
      },
      {
        "key": "todayAppointments",
        "label": "今日订单"
      }
    ],
    "sections": []
  },
  {
    "name": "医生管理",
    "nodeId": "157:523",
    "route": "/doctors",
    "template": "list",
    "resource": "doctors",
    "needsReview": false,
    "title": "医生管理",
    "subtitle": "管理门诊基础资料、排班与预约信息",
    "cardTitle": "医生列表",
    "filters": [
      {
        "key": "search",
        "type": "search",
        "placeholder": "搜索医生、科室或擅长"
      },
      {
        "key": "departmentId",
        "type": "select",
        "label": "全部科室"
      }
    ],
    "actions": [
      {
        "label": "＋ 新增医生",
        "variant": "primary"
      }
    ],
    "columns": [
      {
        "key": "name",
        "label": "医生",
        "kind": "title-desc",
        "descKey": "title"
      },
      {
        "key": "department",
        "label": "科室",
        "kind": "relation",
        "relationLabel": "department.name"
      },
      {
        "key": "specialty",
        "label": "擅长"
      },
      {
        "key": "experience",
        "label": "经验/好评"
      },
      {
        "key": "fee",
        "label": "挂号费"
      },
      {
        "key": "status",
        "label": "状态",
        "kind": "status"
      }
    ],
    "formFields": [
      {
        "key": "avatar",
        "label": "医生头像",
        "type": "text"
      },
      {
        "key": "name",
        "label": "医生姓名",
        "type": "text",
        "required": true
      },
      {
        "key": "title",
        "label": "职称",
        "type": "text",
        "required": true
      },
      {
        "key": "departmentId",
        "label": "所属科室",
        "type": "select",
        "required": true,
        "relatedResource": "departments",
        "relatedLabelKey": "name"
      },
      {
        "key": "fee",
        "label": "挂号费(¥)",
        "type": "number",
        "required": true
      },
      {
        "key": "experienceYears",
        "label": "从业年限",
        "type": "number"
      },
      {
        "key": "goodRate",
        "label": "好评率(%)",
        "type": "number"
      },
      {
        "key": "specialty",
        "label": "擅长领域",
        "type": "textarea"
      },
      {
        "key": "status",
        "label": "状态",
        "type": "select",
        "options": [
          {
            "value": "active",
            "label": "在诊"
          },
          {
            "value": "inactive",
            "label": "停诊"
          }
        ]
      }
    ],
    "rowActions": [
      "edit",
      "delete"
    ],
    "pagination": true,
    "readOnly": false,
    "stats": [
      {
        "key": "departments",
        "label": "启用科室"
      },
      {
        "key": "doctors",
        "label": "在诊医生"
      },
      {
        "key": "pendingAppointments",
        "label": "待就诊"
      },
      {
        "key": "todayAppointments",
        "label": "今日订单"
      }
    ],
    "statusMap": {
      "active": {
        "label": "在诊",
        "color": "success"
      },
      "inactive": {
        "label": "停诊",
        "color": "default"
      }
    },
    "sections": []
  },
  {
    "name": "排班管理",
    "nodeId": "157:756",
    "route": "/schedules",
    "template": "schedule",
    "resource": "schedules",
    "needsReview": false,
    "title": "排班管理",
    "subtitle": "管理医生出诊时间表，支持单日/批量排班，用户端根据排班展示可预约时段",
    "filters": [
      {
        "key": "departmentId",
        "type": "select",
        "label": "全部科室"
      },
      {
        "key": "doctorId",
        "type": "select",
        "label": "全部医生"
      },
      {
        "key": "month",
        "type": "search",
        "label": "日期"
      }
    ],
    "actions": [
      {
        "label": "📅 批量排班",
        "variant": "secondary",
        "modal": "batch-schedule"
      },
      {
        "label": "＋ 新增排班",
        "variant": "primary",
        "modal": "create-schedule"
      }
    ],
    "columns": [
      {
        "key": "doctor",
        "label": "医生",
        "kind": "relation",
        "relationLabel": "doctor.name"
      },
      {
        "key": "date",
        "label": "日期"
      },
      {
        "key": "startTime",
        "label": "开始时间"
      },
      {
        "key": "endTime",
        "label": "结束时间"
      },
      {
        "key": "quota",
        "label": "号源"
      },
      {
        "key": "status",
        "label": "状态",
        "kind": "status"
      }
    ],
    "formFields": [
      {
        "key": "doctorId",
        "label": "选择医生",
        "type": "select",
        "required": true,
        "relatedResource": "doctors",
        "relatedLabelKey": "name"
      },
      {
        "key": "date",
        "label": "排班日期",
        "type": "date",
        "required": true
      },
      {
        "key": "slot",
        "label": "时段",
        "type": "select",
        "required": true,
        "options": [
          {
            "value": "08:00-12:00",
            "label": "上午 (08:00 - 12:00)"
          },
          {
            "value": "14:00-17:00",
            "label": "下午 (14:00 - 17:00)"
          }
        ]
      },
      {
        "key": "quota",
        "label": "可预约号源",
        "type": "number",
        "required": true,
        "hint": "设置该时段可供患者预约的号源数量（1-200）"
      },
      {
        "key": "status",
        "label": "排班状态",
        "type": "select",
        "options": [
          {
            "value": "available",
            "label": "可预约"
          },
          {
            "value": "full",
            "label": "已约满"
          },
          {
            "value": "cancelled",
            "label": "停诊"
          }
        ]
      },
      {
        "key": "remark",
        "label": "备注",
        "type": "text"
      }
    ],
    "rowActions": [
      "edit",
      "delete"
    ],
    "pagination": true,
    "readOnly": false,
    "sections": []
  },
  {
    "name": "预约记录",
    "nodeId": "157:990",
    "route": "/appointments",
    "template": "list",
    "resource": "appointments",
    "needsReview": false,
    "title": "预约记录",
    "subtitle": "查看和管理患者的预约记录",
    "filters": [
      {
        "key": "search",
        "type": "search",
        "placeholder": "搜索患者姓名、医生、预约编号..."
      },
      {
        "key": "departmentId",
        "type": "select",
        "label": "全部科室"
      },
      {
        "key": "status",
        "type": "select",
        "label": "全部状态",
        "options": [
          {
            "value": "",
            "label": "全部状态"
          },
          {
            "value": "pending",
            "label": "待就诊"
          },
          {
            "value": "confirmed",
            "label": "已确认"
          },
          {
            "value": "completed",
            "label": "已就诊"
          },
          {
            "value": "cancelled",
            "label": "已取消"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "📥 导出",
        "variant": "secondary"
      }
    ],
    "columns": [
      {
        "key": "appointmentNo",
        "label": "预约编号"
      },
      {
        "key": "patientName",
        "label": "患者"
      },
      {
        "key": "patientPhone",
        "label": "联系电话"
      },
      {
        "key": "department",
        "label": "科室",
        "kind": "relation",
        "relationLabel": "doctor.department.name"
      },
      {
        "key": "doctor",
        "label": "医生",
        "kind": "relation",
        "relationLabel": "doctor.name"
      },
      {
        "key": "appointmentDate",
        "label": "预约日期"
      },
      {
        "key": "timeSlot",
        "label": "时段"
      },
      {
        "key": "amount",
        "label": "金额"
      },
      {
        "key": "status",
        "label": "状态",
        "kind": "status"
      }
    ],
    "formFields": [
      {
        "key": "appointmentNo",
        "label": "预约编号",
        "type": "text"
      },
      {
        "key": "patientName",
        "label": "患者姓名",
        "type": "text",
        "required": true
      },
      {
        "key": "patientPhone",
        "label": "联系电话",
        "type": "text",
        "required": true
      },
      {
        "key": "doctorId",
        "label": "医生",
        "type": "select",
        "required": true,
        "relatedResource": "doctors",
        "relatedLabelKey": "name"
      },
      {
        "key": "appointmentDate",
        "label": "预约日期",
        "type": "date",
        "required": true
      },
      {
        "key": "timeSlot",
        "label": "时段",
        "type": "text"
      },
      {
        "key": "amount",
        "label": "金额",
        "type": "number"
      },
      {
        "key": "status",
        "label": "状态",
        "type": "select",
        "options": [
          {
            "value": "pending",
            "label": "待就诊"
          },
          {
            "value": "confirmed",
            "label": "已确认"
          },
          {
            "value": "completed",
            "label": "已就诊"
          },
          {
            "value": "cancelled",
            "label": "已取消"
          }
        ]
      }
    ],
    "rowActions": [
      "详情",
      "已就诊",
      "取消"
    ],
    "pagination": true,
    "readOnly": false,
    "stats": [
      {
        "key": "departments",
        "label": "启用科室"
      },
      {
        "key": "doctors",
        "label": "在诊医生"
      },
      {
        "key": "pendingAppointments",
        "label": "待就诊"
      },
      {
        "key": "todayAppointments",
        "label": "今日订单"
      }
    ],
    "statusMap": {
      "pending": {
        "label": "待就诊",
        "color": "warning"
      },
      "confirmed": {
        "label": "已确认",
        "color": "processing"
      },
      "completed": {
        "label": "已就诊",
        "color": "success"
      },
      "cancelled": {
        "label": "已取消",
        "color": "error"
      }
    },
    "sections": []
  },
  {
    "name": "患者管理",
    "nodeId": "157:1292",
    "route": "/patients",
    "template": "list",
    "resource": "patients",
    "needsReview": false,
    "title": "患者管理",
    "subtitle": "管理患者档案、预约历史与标签",
    "filters": [
      {
        "key": "search",
        "type": "search",
        "placeholder": "搜索患者姓名、手机号..."
      },
      {
        "key": "tags",
        "type": "select",
        "label": "全部标签",
        "options": [
          {
            "value": "慢性病患者",
            "label": "慢性病患者"
          },
          {
            "value": "VIP",
            "label": "VIP"
          },
          {
            "value": "黑名单",
            "label": "黑名单"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "📥 导出",
        "variant": "secondary"
      }
    ],
    "columns": [
      {
        "key": "name",
        "label": "患者姓名"
      },
      {
        "key": "gender",
        "label": "性别"
      },
      {
        "key": "age",
        "label": "年龄"
      },
      {
        "key": "phone",
        "label": "手机号"
      },
      {
        "key": "appointmentCount",
        "label": "预约次数"
      },
      {
        "key": "tags",
        "label": "标签"
      },
      {
        "key": "createdAt",
        "label": "注册时间",
        "kind": "datetime"
      },
      {
        "key": "status",
        "label": "状态",
        "kind": "status"
      }
    ],
    "formFields": [
      {
        "key": "name",
        "label": "患者姓名",
        "type": "text",
        "required": true
      },
      {
        "key": "gender",
        "label": "性别",
        "type": "select",
        "options": [
          {
            "value": "男",
            "label": "男"
          },
          {
            "value": "女",
            "label": "女"
          }
        ]
      },
      {
        "key": "age",
        "label": "年龄",
        "type": "number"
      },
      {
        "key": "phone",
        "label": "手机号",
        "type": "text",
        "required": true
      },
      {
        "key": "tags",
        "label": "标签",
        "type": "text"
      },
      {
        "key": "status",
        "label": "状态",
        "type": "select",
        "options": [
          {
            "value": "active",
            "label": "正常"
          },
          {
            "value": "blacklisted",
            "label": "已拉黑"
          }
        ]
      }
    ],
    "rowActions": [
      "详情",
      "🔖 标签"
    ],
    "pagination": true,
    "readOnly": false,
    "stats": [
      {
        "key": "totalPatients",
        "label": "总患者"
      },
      {
        "key": "todayNew",
        "label": "今日新增"
      },
      {
        "key": "monthAppointments",
        "label": "本月预约"
      },
      {
        "key": "blacklist",
        "label": "黑名单"
      }
    ],
    "statusMap": {
      "active": {
        "label": "正常",
        "color": "success"
      },
      "blacklisted": {
        "label": "已拉黑",
        "color": "error"
      }
    },
    "sections": []
  },
  {
    "name": "订单管理",
    "nodeId": "157:1511",
    "route": "/orders",
    "template": "list",
    "resource": "orders",
    "needsReview": false,
    "title": "订单管理",
    "subtitle": "管理挂号费支付订单与退款",
    "filters": [
      {
        "key": "search",
        "type": "search",
        "placeholder": "搜索订单号、患者..."
      },
      {
        "key": "status",
        "type": "select",
        "label": "全部状态",
        "options": [
          {
            "value": "",
            "label": "全部状态"
          },
          {
            "value": "paid",
            "label": "已支付"
          },
          {
            "value": "refunded",
            "label": "已退款"
          },
          {
            "value": "pending",
            "label": "待支付"
          },
          {
            "value": "cancelled",
            "label": "已取消"
          }
        ]
      },
      {
        "key": "month",
        "type": "search",
        "label": "2026年08月"
      }
    ],
    "actions": [
      {
        "label": "📥 导出",
        "variant": "secondary"
      }
    ],
    "columns": [
      {
        "key": "orderNo",
        "label": "订单编号"
      },
      {
        "key": "patient",
        "label": "患者",
        "kind": "relation",
        "relationLabel": "patient.name"
      },
      {
        "key": "doctorName",
        "label": "医生"
      },
      {
        "key": "department",
        "label": "科室"
      },
      {
        "key": "amount",
        "label": "金额"
      },
      {
        "key": "status",
        "label": "支付状态",
        "kind": "status"
      },
      {
        "key": "paidAt",
        "label": "支付时间",
        "kind": "datetime"
      },
      {
        "key": "payMethod",
        "label": "支付方式"
      }
    ],
    "formFields": [
      {
        "key": "orderNo",
        "label": "订单编号",
        "type": "text",
        "required": true
      },
      {
        "key": "patientId",
        "label": "患者",
        "type": "select",
        "required": true,
        "relatedResource": "patients",
        "relatedLabelKey": "name"
      },
      {
        "key": "doctorName",
        "label": "医生",
        "type": "text"
      },
      {
        "key": "amount",
        "label": "金额",
        "type": "number",
        "required": true
      },
      {
        "key": "payMethod",
        "label": "支付方式",
        "type": "text"
      },
      {
        "key": "status",
        "label": "支付状态",
        "type": "select",
        "options": [
          {
            "value": "paid",
            "label": "已支付"
          },
          {
            "value": "refunded",
            "label": "已退款"
          },
          {
            "value": "pending",
            "label": "待支付"
          },
          {
            "value": "cancelled",
            "label": "已取消"
          }
        ]
      }
    ],
    "rowActions": [
      "详情",
      "退款"
    ],
    "pagination": true,
    "readOnly": false,
    "stats": [
      {
        "key": "todayOrders",
        "label": "今日订单"
      },
      {
        "key": "todayIncome",
        "label": "今日收入"
      },
      {
        "key": "pendingRefunds",
        "label": "待退款"
      },
      {
        "key": "monthIncome",
        "label": "本月收入"
      }
    ],
    "statusMap": {
      "paid": {
        "label": "已支付",
        "color": "success"
      },
      "refunded": {
        "label": "已退款",
        "color": "warning"
      },
      "pending": {
        "label": "待支付",
        "color": "warning"
      },
      "cancelled": {
        "label": "已取消",
        "color": "error"
      }
    },
    "sections": []
  },
  {
    "name": "通知管理",
    "nodeId": "157:1934",
    "route": "/notifications",
    "template": "list",
    "resource": "notifications",
    "needsReview": false,
    "title": "通知管理",
    "subtitle": "管理向患者发送的各类通知",
    "cardTitle": "通知模板",
    "filters": [],
    "actions": [
      {
        "label": "＋ 新增模板",
        "variant": "primary"
      }
    ],
    "columns": [
      {
        "key": "title",
        "label": "模板名称"
      },
      {
        "key": "type",
        "label": "类型"
      },
      {
        "key": "triggerScene",
        "label": "触发场景"
      },
      {
        "key": "updatedAt",
        "label": "更新时间",
        "kind": "datetime"
      },
      {
        "key": "status",
        "label": "状态",
        "kind": "status"
      }
    ],
    "formFields": [
      {
        "key": "title",
        "label": "模板名称",
        "type": "text",
        "required": true
      },
      {
        "key": "type",
        "label": "类型",
        "type": "select",
        "options": [
          {
            "value": "wechat",
            "label": "微信模板"
          },
          {
            "value": "sms",
            "label": "短信"
          }
        ]
      },
      {
        "key": "triggerScene",
        "label": "触发场景",
        "type": "text"
      },
      {
        "key": "content",
        "label": "模板内容",
        "type": "textarea"
      },
      {
        "key": "status",
        "label": "状态",
        "type": "select",
        "options": [
          {
            "value": "active",
            "label": "启用"
          },
          {
            "value": "inactive",
            "label": "停用"
          }
        ]
      }
    ],
    "rowActions": [
      "编辑",
      "📋 预览"
    ],
    "pagination": true,
    "readOnly": false,
    "statusMap": {
      "active": {
        "label": "启用",
        "color": "success"
      },
      "inactive": {
        "label": "停用",
        "color": "default"
      }
    },
    "sections": [
      {
        "title": "发送记录",
        "resource": "notification-logs",
        "columns": [
          {
            "key": "receiver",
            "label": "接收人"
          },
          {
            "key": "template",
            "label": "模板"
          },
          {
            "key": "contentSummary",
            "label": "内容摘要"
          },
          {
            "key": "sentAt",
            "label": "发送时间",
            "kind": "datetime"
          },
          {
            "key": "status",
            "label": "状态",
            "kind": "status"
          }
        ],
        "rowActions": [],
        "pagination": true,
        "statusMap": {
          "sent": {
            "label": "发送成功",
            "color": "success"
          },
          "failed": {
            "label": "发送失败",
            "color": "error"
          }
        }
      }
    ]
  },
  {
    "name": "地址管理",
    "nodeId": "157:2161",
    "route": "/addresses",
    "template": "list",
    "resource": "addresses",
    "needsReview": false,
    "title": "地址管理",
    "subtitle": "管理页面地址与跳转路径",
    "filters": [],
    "actions": [
      {
        "label": "＋ 添加",
        "variant": "primary"
      },
      {
        "label": "📝 修改",
        "variant": "secondary"
      },
      {
        "label": "🗑 删除",
        "variant": "secondary"
      }
    ],
    "columns": [
      {
        "key": "id",
        "label": "编号"
      },
      {
        "key": "name",
        "label": "地址名称"
      },
      {
        "key": "detail",
        "label": "地址"
      }
    ],
    "formFields": [
      {
        "key": "name",
        "label": "地址名称",
        "type": "text",
        "required": true
      },
      {
        "key": "detail",
        "label": "地址",
        "type": "text",
        "required": true
      }
    ],
    "rowActions": [
      "修改",
      "删除"
    ],
    "pagination": true,
    "readOnly": false,
    "sections": []
  },
  {
    "name": "广告位管理",
    "nodeId": "157:2435",
    "route": "/banners",
    "template": "list",
    "resource": "banners",
    "needsReview": false,
    "title": "广告位管理",
    "subtitle": "管理首页及活动广告图片",
    "filters": [],
    "actions": [
      {
        "label": "＋ 添加",
        "variant": "primary"
      },
      {
        "label": "📝 修改",
        "variant": "secondary"
      },
      {
        "label": "🗑 删除",
        "variant": "secondary"
      }
    ],
    "columns": [
      {
        "key": "id",
        "label": "编号"
      },
      {
        "key": "title",
        "label": "广告位"
      },
      {
        "key": "imageUrl",
        "label": "广告图"
      },
      {
        "key": "linkUrl",
        "label": "跳转地址"
      },
      {
        "key": "sortOrder",
        "label": "参数"
      }
    ],
    "formFields": [
      {
        "key": "title",
        "label": "广告位",
        "type": "text",
        "required": true
      },
      {
        "key": "imageUrl",
        "label": "广告图",
        "type": "text",
        "required": true
      },
      {
        "key": "linkUrl",
        "label": "跳转地址",
        "type": "text"
      },
      {
        "key": "sortOrder",
        "label": "参数",
        "type": "number"
      }
    ],
    "rowActions": [
      "修改",
      "删除"
    ],
    "pagination": true,
    "readOnly": false,
    "sections": []
  },
  {
    "name": "公告管理",
    "nodeId": "157:2635",
    "route": "/announcements",
    "template": "list",
    "resource": "announcements",
    "needsReview": false,
    "title": "公告管理",
    "subtitle": "发布和管理系统公告信息",
    "filters": [],
    "actions": [
      {
        "label": "＋ 添加",
        "variant": "primary"
      },
      {
        "label": "📝 修改",
        "variant": "secondary"
      },
      {
        "label": "🗑 删除",
        "variant": "secondary"
      }
    ],
    "columns": [
      {
        "key": "id",
        "label": "编号"
      },
      {
        "key": "title",
        "label": "公告标题"
      },
      {
        "key": "content",
        "label": "公告内容"
      },
      {
        "key": "publishAt",
        "label": "发布时间",
        "kind": "datetime"
      },
      {
        "key": "updatedAt",
        "label": "更新时间",
        "kind": "datetime"
      },
      {
        "key": "publisher",
        "label": "发布人"
      }
    ],
    "formFields": [
      {
        "key": "title",
        "label": "公告标题",
        "type": "text",
        "required": true
      },
      {
        "key": "content",
        "label": "公告内容",
        "type": "textarea",
        "required": true
      },
      {
        "key": "publisher",
        "label": "发布人",
        "type": "text"
      },
      {
        "key": "publishAt",
        "label": "发布时间",
        "type": "text"
      }
    ],
    "rowActions": [
      "修改",
      "删除"
    ],
    "pagination": true,
    "readOnly": false,
    "sections": []
  },
  {
    "name": "新闻列表",
    "nodeId": "157:2846",
    "route": "/news",
    "template": "list",
    "resource": "news",
    "needsReview": false,
    "title": "新闻列表",
    "subtitle": "管理健康资讯、科普文章及视频内容",
    "filters": [
      {
        "key": "title",
        "type": "search",
        "placeholder": "请输入新闻标题"
      }
    ],
    "actions": [
      {
        "label": "＋ 添加",
        "variant": "primary"
      },
      {
        "label": "📝 修改",
        "variant": "secondary"
      },
      {
        "label": "🗑 删除",
        "variant": "secondary"
      },
      {
        "label": "👁 查看详情",
        "variant": "secondary"
      }
    ],
    "columns": [
      {
        "key": "id",
        "label": "编号"
      },
      {
        "key": "title",
        "label": "新闻标题"
      },
      {
        "key": "smallImage",
        "label": "小图"
      },
      {
        "key": "largeImage",
        "label": "大图"
      },
      {
        "key": "category",
        "label": "分类名称",
        "kind": "relation",
        "relationLabel": "category.name"
      },
      {
        "key": "type",
        "label": "类型"
      },
      {
        "key": "createdAt",
        "label": "创建时间",
        "kind": "datetime"
      }
    ],
    "formFields": [
      {
        "key": "categoryId",
        "label": "所属分类",
        "type": "select",
        "required": true,
        "relatedResource": "news-categories",
        "relatedLabelKey": "name"
      },
      {
        "key": "title",
        "label": "新闻标题",
        "type": "text",
        "required": true
      },
      {
        "key": "smallImage",
        "label": "小图",
        "type": "text",
        "required": true
      },
      {
        "key": "largeImage",
        "label": "大图",
        "type": "text",
        "required": true
      },
      {
        "key": "type",
        "label": "类型",
        "type": "select",
        "required": true,
        "options": [
          {
            "value": "图文",
            "label": "图文"
          },
          {
            "value": "视频",
            "label": "视频"
          }
        ]
      },
      {
        "key": "content",
        "label": "新闻内容",
        "type": "textarea"
      }
    ],
    "rowActions": [
      "修改",
      "删除"
    ],
    "pagination": true,
    "readOnly": false,
    "sections": []
  },
  {
    "name": "导航栏管理",
    "nodeId": "157:3317",
    "route": "/nav-items",
    "template": "list",
    "resource": "nav-items",
    "needsReview": false,
    "title": "导航栏管理",
    "subtitle": "管理小程序/App底部导航栏配置",
    "filters": [],
    "actions": [
      {
        "label": "＋ 添加",
        "variant": "primary"
      },
      {
        "label": "修改",
        "variant": "secondary"
      },
      {
        "label": "删除",
        "variant": "secondary"
      },
      {
        "label": "查看详情",
        "variant": "secondary"
      }
    ],
    "columns": [
      {
        "key": "id",
        "label": "编号"
      },
      {
        "key": "label",
        "label": "标题"
      },
      {
        "key": "icon",
        "label": "图标"
      },
      {
        "key": "path",
        "label": "跳转地址"
      },
      {
        "key": "params",
        "label": "参数"
      },
      {
        "key": "sortOrder",
        "label": "排序"
      }
    ],
    "formFields": [
      {
        "key": "label",
        "label": "标题",
        "type": "text",
        "required": true
      },
      {
        "key": "icon",
        "label": "图标",
        "type": "text"
      },
      {
        "key": "path",
        "label": "跳转地址",
        "type": "text",
        "required": true
      },
      {
        "key": "params",
        "label": "参数",
        "type": "text"
      },
      {
        "key": "sortOrder",
        "label": "排序",
        "type": "number"
      }
    ],
    "rowActions": [
      "修改",
      "删除"
    ],
    "pagination": true,
    "readOnly": false,
    "sections": []
  },
  {
    "name": "意见反馈",
    "nodeId": "157:3568",
    "route": "/feedbacks",
    "template": "list",
    "resource": "feedback",
    "needsReview": false,
    "title": "意见反馈",
    "subtitle": "查看和处理用户反馈意见",
    "cardTitle": "反馈列表",
    "filters": [],
    "actions": [],
    "columns": [
      {
        "key": "id",
        "label": "序号"
      },
      {
        "key": "userName",
        "label": "用户"
      },
      {
        "key": "content",
        "label": "反馈内容"
      },
      {
        "key": "images",
        "label": "反馈图片"
      },
      {
        "key": "contact",
        "label": "联系方式"
      },
      {
        "key": "createdAt",
        "label": "提交时间",
        "kind": "datetime"
      },
      {
        "key": "status",
        "label": "状态",
        "kind": "status"
      }
    ],
    "formFields": [
      {
        "key": "userName",
        "label": "用户",
        "type": "text",
        "required": true
      },
      {
        "key": "contact",
        "label": "联系方式",
        "type": "text"
      },
      {
        "key": "content",
        "label": "反馈内容",
        "type": "textarea",
        "required": true
      },
      {
        "key": "images",
        "label": "反馈图片",
        "type": "text"
      },
      {
        "key": "status",
        "label": "状态",
        "type": "select",
        "options": [
          {
            "value": "pending",
            "label": "待处理"
          },
          {
            "value": "replied",
            "label": "已回复"
          },
          {
            "value": "closed",
            "label": "已关闭"
          }
        ]
      },
      {
        "key": "reply",
        "label": "回复",
        "type": "textarea"
      }
    ],
    "rowActions": [
      "处理",
      "回复"
    ],
    "pagination": true,
    "readOnly": false,
    "statusMap": {
      "pending": {
        "label": "待处理",
        "color": "warning"
      },
      "replied": {
        "label": "已回复",
        "color": "success"
      },
      "closed": {
        "label": "已关闭",
        "color": "default"
      }
    },
    "sections": []
  },
  {
    "name": "用户管理",
    "nodeId": "157:3692",
    "route": "/users",
    "template": "list",
    "resource": "users",
    "needsReview": false,
    "title": "用户管理",
    "subtitle": "管理系统管理员账号信息",
    "cardTitle": "管理员账号",
    "filters": [],
    "actions": [
      {
        "label": "＋ 新增账号",
        "variant": "primary"
      }
    ],
    "columns": [
      {
        "key": "username",
        "label": "用户名"
      },
      {
        "key": "name",
        "label": "姓名"
      },
      {
        "key": "role",
        "label": "角色",
        "kind": "relation",
        "relationLabel": "role.name"
      },
      {
        "key": "phone",
        "label": "手机号"
      },
      {
        "key": "createdAt",
        "label": "创建时间",
        "kind": "datetime"
      },
      {
        "key": "status",
        "label": "状态",
        "kind": "status"
      }
    ],
    "formFields": [
      {
        "key": "username",
        "label": "用户名",
        "type": "text",
        "required": true
      },
      {
        "key": "name",
        "label": "姓名",
        "type": "text",
        "required": true
      },
      {
        "key": "phone",
        "label": "手机号",
        "type": "text"
      },
      {
        "key": "roleId",
        "label": "角色",
        "type": "select",
        "required": true,
        "relatedResource": "roles",
        "relatedLabelKey": "name"
      },
      {
        "key": "password",
        "label": "密码",
        "type": "password"
      },
      {
        "key": "status",
        "label": "状态",
        "type": "select",
        "options": [
          {
            "value": "active",
            "label": "正常"
          },
          {
            "value": "inactive",
            "label": "停用"
          }
        ]
      }
    ],
    "rowActions": [
      "编辑",
      "重置密码"
    ],
    "pagination": true,
    "readOnly": false,
    "statusMap": {
      "active": {
        "label": "正常",
        "color": "success"
      },
      "inactive": {
        "label": "停用",
        "color": "default"
      }
    },
    "sections": []
  },
  {
    "name": "角色管理",
    "nodeId": "157:3837",
    "route": "/roles",
    "template": "list",
    "resource": "roles",
    "needsReview": false,
    "title": "角色管理",
    "subtitle": "管理角色与权限分配",
    "cardTitle": "角色列表",
    "filters": [],
    "actions": [
      {
        "label": "＋ 新增角色",
        "variant": "primary"
      }
    ],
    "columns": [
      {
        "key": "name",
        "label": "角色名称"
      },
      {
        "key": "description",
        "label": "权限描述"
      },
      {
        "key": "memberCount",
        "label": "成员数"
      },
      {
        "key": "createdAt",
        "label": "创建时间",
        "kind": "datetime"
      },
      {
        "key": "status",
        "label": "状态",
        "kind": "status"
      }
    ],
    "formFields": [
      {
        "key": "name",
        "label": "角色名称",
        "type": "text",
        "required": true
      },
      {
        "key": "description",
        "label": "权限描述",
        "type": "textarea"
      },
      {
        "key": "status",
        "label": "状态",
        "type": "select",
        "options": [
          {
            "value": "active",
            "label": "启用"
          },
          {
            "value": "inactive",
            "label": "停用"
          }
        ]
      }
    ],
    "rowActions": [
      "编辑",
      "配置权限"
    ],
    "pagination": true,
    "readOnly": false,
    "sections": []
  },
  {
    "name": "预约规则",
    "nodeId": "157:3973",
    "route": "/appointment-rules",
    "template": "form",
    "resource": "appointment-rules",
    "needsReview": false,
    "title": "预约规则",
    "subtitle": "配置预约挂号相关规则参数",
    "formCard": {
      "title": "预约规则配置",
      "primaryAction": "💾 保存"
    },
    "filters": [],
    "actions": [],
    "columns": [],
    "formFields": [
      {
        "key": "advanceDays",
        "label": "提前预约天数",
        "type": "number",
        "required": true,
        "hint": "患者最多可提前N天预约"
      },
      {
        "key": "deadline",
        "label": "当天预约截止",
        "type": "select",
        "required": true,
        "options": [
          {
            "value": "12:00",
            "label": "12:00"
          },
          {
            "value": "16:00",
            "label": "16:00"
          },
          {
            "value": "17:00",
            "label": "17:00"
          }
        ]
      },
      {
        "key": "cancelRule",
        "label": "取消预约规则",
        "type": "select",
        "required": true,
        "options": [
          {
            "value": "就诊前2小时可取消",
            "label": "就诊前2小时可取消"
          },
          {
            "value": "就诊前4小时可取消",
            "label": "就诊前4小时可取消"
          },
          {
            "value": "就诊前6小时可取消",
            "label": "就诊前6小时可取消"
          }
        ]
      },
      {
        "key": "noShowLimit",
        "label": "爽约限制次数",
        "type": "number",
        "required": true,
        "hint": "超过后自动拉入黑名单"
      }
    ],
    "rowActions": [],
    "pagination": false,
    "readOnly": false,
    "sections": []
  },
  {
    "name": "操作日志",
    "nodeId": "157:4067",
    "route": "/operation-logs",
    "template": "list",
    "resource": "operation-logs",
    "needsReview": false,
    "title": "操作日志",
    "subtitle": "查看系统操作记录与审计日志",
    "filters": [],
    "actions": [],
    "columns": [
      {
        "key": "userName",
        "label": "操作人"
      },
      {
        "key": "action",
        "label": "操作内容"
      },
      {
        "key": "ip",
        "label": "IP地址"
      },
      {
        "key": "createdAt",
        "label": "操作时间",
        "kind": "datetime"
      }
    ],
    "formFields": [],
    "rowActions": [],
    "pagination": true,
    "readOnly": true,
    "sections": []
  },
  {
    "name": "评价管理",
    "nodeId": "160:2",
    "route": "/reviews",
    "template": "list",
    "resource": "reviews",
    "needsReview": false,
    "title": "评价管理",
    "subtitle": "管理患者对医生的就诊评价",
    "filters": [
      {
        "key": "search",
        "type": "search",
        "placeholder": "搜索评价内容、患者、医生..."
      },
      {
        "key": "rating",
        "type": "select",
        "label": "全部评分",
        "options": [
          {
            "value": "5",
            "label": "5星"
          },
          {
            "value": "4",
            "label": "4星"
          },
          {
            "value": "3",
            "label": "3星"
          },
          {
            "value": "2",
            "label": "2星"
          },
          {
            "value": "1",
            "label": "1星"
          }
        ]
      }
    ],
    "actions": [],
    "columns": [
      {
        "key": "patientName",
        "label": "患者"
      },
      {
        "key": "doctor",
        "label": "医生",
        "kind": "relation",
        "relationLabel": "doctor.name"
      },
      {
        "key": "rating",
        "label": "评分"
      },
      {
        "key": "content",
        "label": "评价内容"
      },
      {
        "key": "createdAt",
        "label": "评价时间",
        "kind": "datetime"
      },
      {
        "key": "status",
        "label": "状态",
        "kind": "status"
      }
    ],
    "formFields": [
      {
        "key": "patientName",
        "label": "患者",
        "type": "text",
        "required": true
      },
      {
        "key": "doctorId",
        "label": "医生",
        "type": "select",
        "required": true,
        "relatedResource": "doctors",
        "relatedLabelKey": "name"
      },
      {
        "key": "rating",
        "label": "评分",
        "type": "number",
        "required": true
      },
      {
        "key": "content",
        "label": "评价内容",
        "type": "textarea"
      },
      {
        "key": "status",
        "label": "状态",
        "type": "select",
        "options": [
          {
            "value": "pending",
            "label": "待处理"
          },
          {
            "value": "published",
            "label": "已展示"
          },
          {
            "value": "hidden",
            "label": "已隐藏"
          }
        ]
      }
    ],
    "rowActions": [
      "💬 回复",
      "🙈 隐藏"
    ],
    "pagination": true,
    "readOnly": false,
    "statusMap": {
      "pending": {
        "label": "待处理",
        "color": "warning"
      },
      "published": {
        "label": "已展示",
        "color": "success"
      },
      "hidden": {
        "label": "已隐藏",
        "color": "default"
      }
    },
    "sections": []
  },
  {
    "name": "新闻分类",
    "nodeId": "162:2",
    "route": "/news-categories",
    "template": "list",
    "resource": "news-categories",
    "needsReview": false,
    "title": "新闻分类",
    "subtitle": "管理新闻资讯的分类与分类大图",
    "filters": [],
    "actions": [
      {
        "label": "＋ 新增",
        "variant": "primary"
      },
      {
        "label": "📝 修改",
        "variant": "secondary"
      },
      {
        "label": "🗑 删除",
        "variant": "secondary"
      },
      {
        "label": "👁 查看详情",
        "variant": "secondary"
      }
    ],
    "columns": [
      {
        "key": "id",
        "label": "编号"
      },
      {
        "key": "name",
        "label": "分类名称"
      },
      {
        "key": "image",
        "label": "分类大图"
      },
      {
        "key": "status",
        "label": "状态",
        "kind": "status"
      }
    ],
    "formFields": [
      {
        "key": "name",
        "label": "分类名称",
        "type": "text",
        "required": true
      },
      {
        "key": "image",
        "label": "分类大图",
        "type": "text"
      },
      {
        "key": "status",
        "label": "状态",
        "type": "select",
        "options": [
          {
            "value": "active",
            "label": "启用"
          },
          {
            "value": "inactive",
            "label": "停用"
          }
        ]
      }
    ],
    "rowActions": [
      "修改",
      "删除"
    ],
    "pagination": true,
    "readOnly": false,
    "sections": []
  }
];

export const sidebarChrome = {
  "nodeId": "157:4526",
  "width": 220,
  "brandTitle": "阳光医疗门诊",
  "brandSubtitle": "预约挂号管理后台",
  "groups": [
    {
      "id": "main",
      "label": null,
      "items": [
        "首页",
        "机构信息",
        "科室管理",
        "医生管理",
        "排班管理",
        "预约记录",
        "患者管理",
        "订单管理",
        "评价管理"
      ]
    },
    {
      "id": "ops",
      "label": "系统运营",
      "items": [
        "地址管理",
        "广告位管理",
        "公告管理",
        "新闻列表",
        "新闻分类",
        "导航栏管理",
        "意见反馈",
        "预约规则",
        "通知管理"
      ]
    },
    {
      "id": "system",
      "label": "系统管理",
      "items": [
        "用户管理",
        "角色管理",
        "操作日志"
      ]
    }
  ]
};

export const modalConfigs = [
  {
    "id": "create-department",
    "name": "新增科室弹窗",
    "nodeId": "157:4177",
    "kind": "form",
    "title": "新增科室",
    "width": 520,
    "primaryAction": "确定",
    "secondaryAction": "取消",
    "screen": "科室管理",
    "fields": [
      {
        "key": "name",
        "label": "科室名称",
        "type": "text",
        "required": true
      },
      {
        "key": "icon",
        "label": "科室图标",
        "type": "text",
        "required": true
      },
      {
        "key": "description",
        "label": "科室描述",
        "type": "textarea"
      },
      {
        "key": "sortOrder",
        "label": "排序",
        "type": "number"
      },
      {
        "key": "status",
        "label": "状态",
        "type": "select",
        "options": [
          {
            "value": "active",
            "label": "启用"
          },
          {
            "value": "inactive",
            "label": "停用"
          }
        ]
      }
    ]
  },
  {
    "id": "create-doctor",
    "name": "新增医生弹窗",
    "nodeId": "157:4212",
    "kind": "form",
    "title": "新增医生",
    "width": 520,
    "primaryAction": "确定",
    "secondaryAction": "取消",
    "screen": "医生管理",
    "fields": [
      {
        "key": "avatar",
        "label": "医生头像",
        "type": "text"
      },
      {
        "key": "name",
        "label": "医生姓名",
        "type": "text",
        "required": true
      },
      {
        "key": "title",
        "label": "职称",
        "type": "text",
        "required": true
      },
      {
        "key": "departmentId",
        "label": "所属科室",
        "type": "select",
        "required": true,
        "relatedResource": "departments",
        "relatedLabelKey": "name"
      },
      {
        "key": "fee",
        "label": "挂号费(¥)",
        "type": "number",
        "required": true
      },
      {
        "key": "experienceYears",
        "label": "从业年限",
        "type": "number"
      },
      {
        "key": "goodRate",
        "label": "好评率(%)",
        "type": "number"
      },
      {
        "key": "specialty",
        "label": "擅长领域",
        "type": "textarea"
      },
      {
        "key": "status",
        "label": "状态",
        "type": "select",
        "options": [
          {
            "value": "active",
            "label": "在诊"
          },
          {
            "value": "inactive",
            "label": "停诊"
          }
        ]
      }
    ]
  },
  {
    "id": "create-news",
    "name": "新增新闻弹窗",
    "nodeId": "157:4264",
    "kind": "form",
    "title": "新增新闻",
    "width": 520,
    "primaryAction": "确定",
    "secondaryAction": "取消",
    "screen": "新闻列表",
    "fields": [
      {
        "key": "categoryId",
        "label": "所属分类",
        "type": "select",
        "required": true,
        "relatedResource": "news-categories",
        "relatedLabelKey": "name"
      },
      {
        "key": "title",
        "label": "新闻标题",
        "type": "text",
        "required": true
      },
      {
        "key": "smallImage",
        "label": "小图",
        "type": "text",
        "required": true
      },
      {
        "key": "largeImage",
        "label": "大图",
        "type": "text",
        "required": true
      },
      {
        "key": "type",
        "label": "类型",
        "type": "select",
        "required": true,
        "options": [
          {
            "value": "图文",
            "label": "图文"
          },
          {
            "value": "视频",
            "label": "视频"
          }
        ]
      },
      {
        "key": "content",
        "label": "新闻内容",
        "type": "textarea"
      }
    ]
  },
  {
    "id": "create-schedule",
    "name": "新增排班弹窗",
    "nodeId": "176:4",
    "kind": "form",
    "title": "新增排班",
    "width": 520,
    "primaryAction": "确定",
    "secondaryAction": "取消",
    "screen": "排班管理",
    "fields": [
      {
        "key": "doctorId",
        "label": "选择医生",
        "type": "select",
        "required": true,
        "relatedResource": "doctors",
        "relatedLabelKey": "name"
      },
      {
        "key": "date",
        "label": "排班日期",
        "type": "date",
        "required": true
      },
      {
        "key": "slot",
        "label": "时段",
        "type": "select",
        "required": true,
        "options": [
          {
            "value": "08:00-12:00",
            "label": "上午 (08:00 - 12:00)"
          },
          {
            "value": "14:00-17:00",
            "label": "下午 (14:00 - 17:00)"
          }
        ]
      },
      {
        "key": "quota",
        "label": "可预约号源",
        "type": "number",
        "required": true,
        "hint": "设置该时段可供患者预约的号源数量（1-200）"
      },
      {
        "key": "status",
        "label": "排班状态",
        "type": "select",
        "options": [
          {
            "value": "available",
            "label": "可预约"
          },
          {
            "value": "full",
            "label": "已约满"
          },
          {
            "value": "cancelled",
            "label": "停诊"
          }
        ]
      },
      {
        "key": "remark",
        "label": "备注",
        "type": "text"
      }
    ]
  },
  {
    "id": "batch-schedule",
    "name": "批量排班弹窗",
    "nodeId": "176:46",
    "kind": "form",
    "title": "批量排班",
    "width": 520,
    "primaryAction": "确认生成",
    "secondaryAction": "取消",
    "fields": [
      {
        "key": "templateType",
        "label": "模板类型",
        "type": "select",
        "required": true,
        "options": [
          {
            "value": "weekly",
            "label": "按周模板（本周/下周）"
          }
        ]
      },
      {
        "key": "doctorId",
        "label": "选择医生",
        "type": "select",
        "required": true,
        "relatedResource": "doctors",
        "relatedLabelKey": "name"
      },
      {
        "key": "weekdays",
        "label": "选择排班日期",
        "type": "text",
        "required": true
      },
      {
        "key": "weekRange",
        "label": "生效周范围",
        "type": "text",
        "required": true
      },
      {
        "key": "slot",
        "label": "时段",
        "type": "select",
        "required": true,
        "options": [
          {
            "value": "08:00-12:00",
            "label": "上午 (08:00 - 12:00)"
          },
          {
            "value": "14:00-17:00",
            "label": "下午 (14:00 - 17:00)"
          }
        ]
      },
      {
        "key": "quota",
        "label": "可预约号源",
        "type": "number",
        "required": true
      },
      {
        "key": "status",
        "label": "排班状态",
        "type": "select",
        "options": [
          {
            "value": "available",
            "label": "可预约"
          },
          {
            "value": "full",
            "label": "已约满"
          },
          {
            "value": "cancelled",
            "label": "停诊"
          }
        ]
      }
    ]
  },
  {
    "id": "delete-schedule-has-appointments",
    "name": "确认删除（有冲突）弹窗",
    "nodeId": "176:156",
    "kind": "warning",
    "title": "确认删除",
    "message": "该排班已有患者预约。删除后将自动通知患者并退款，请谨慎操作。",
    "primaryAction": "强制删除（已通知患者）",
    "secondaryAction": "取消",
    "width": 580,
    "fields": []
  },
  {
    "id": "delete-schedule-empty",
    "name": "确认删除弹窗",
    "nodeId": "176:127",
    "kind": "confirm",
    "title": "确认删除",
    "message": "确定要删除此排班记录吗？",
    "primaryAction": "确定",
    "secondaryAction": "取消",
    "width": 580,
    "fields": []
  }
];

export function getScreenByRoute(route: string): ScreenConfig | undefined {
  return screenConfigs.find((s) => s.route === route);
}
