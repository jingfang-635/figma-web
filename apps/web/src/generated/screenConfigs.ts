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
  optionsFrom?: string;
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
  formCard?: { title?: string; subtitle?: string; primaryAction?: string };
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
    "resource": "dashboard",
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
        "key": "appointments",
        "label": "本月预约量"
      },
      {
        "key": "visitRate",
        "label": "就诊率"
      },
      {
        "key": "noshowRate",
        "label": "爽约率"
      },
      {
        "key": "revenue",
        "label": "本月收入"
      }
    ],
    "sections": [
      {
        "title": "关键指标",
        "resource": "dashboard",
        "columns": [],
        "rowActions": [],
        "pagination": false
      }
    ]
  },
  {
    "name": "机构信息",
    "nodeId": "157:203",
    "route": "/organization",
    "template": "form",
    "resource": "organization",
    "needsReview": false,
    "title": "机构信息",
    "subtitle": "管理门诊基础资料、排班与预约信息",
    "formCard": {
      "title": "机构基础信息",
      "subtitle": "小程序首页、预约详情和后台使用同一份机构资料",
      "primaryAction": "保存机构信息"
    },
    "filters": [],
    "actions": [],
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
        "key": "hours",
        "label": "营业时间",
        "type": "text"
      },
      {
        "key": "address",
        "label": "机构地址",
        "type": "text"
      },
      {
        "key": "intro",
        "label": "机构简介",
        "type": "textarea"
      }
    ],
    "rowActions": [],
    "pagination": false,
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
        "key": "pending",
        "label": "待就诊"
      },
      {
        "key": "ordersToday",
        "label": "今日订单"
      }
    ],
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
    "cardTitle": "科室列表",
    "cardSubtitle": "维护小程序展示的科室名称、说明和图标",
    "filters": [],
    "actions": [
      {
        "label": "新增科室",
        "variant": "primary",
        "modal": "modal-create-dept"
      }
    ],
    "columns": [
      {
        "key": "name",
        "label": "科室"
      },
      {
        "key": "doctorCount",
        "label": "医生数量",
        "kind": "text"
      },
      {
        "key": "sort",
        "label": "排序"
      },
      {
        "key": "status",
        "label": "状态",
        "kind": "status"
      }
    ],
    "formFields": [],
    "rowActions": [
      "编辑",
      "删除"
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
        "key": "pending",
        "label": "待就诊"
      },
      {
        "key": "ordersToday",
        "label": "今日订单"
      }
    ],
    "statusMap": {
      "active": {
        "label": "启用",
        "color": "success"
      },
      "disabled": {
        "label": "停用",
        "color": "default"
      }
    },
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
    "cardSubtitle": "挂号费按医生配置，医生停用后用户端不再展示",
    "filters": [
      {
        "key": "search",
        "type": "search",
        "placeholder": "搜索医生、科室或擅长"
      },
      {
        "key": "deptId",
        "type": "select",
        "label": "全部科室",
        "optionsFrom": "departments"
      }
    ],
    "actions": [
      {
        "label": "新增医生",
        "variant": "primary",
        "modal": "modal-create-doctor"
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
        "key": "deptName",
        "label": "科室",
        "kind": "relation"
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
    "formFields": [],
    "rowActions": [
      "编辑",
      "删除"
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
        "key": "pending",
        "label": "待就诊"
      },
      {
        "key": "ordersToday",
        "label": "今日订单"
      }
    ],
    "statusMap": {
      "active": {
        "label": "在诊",
        "color": "success"
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
        "key": "deptId",
        "type": "select",
        "label": "全部科室",
        "optionsFrom": "departments"
      },
      {
        "key": "doctorId",
        "type": "select",
        "label": "全部医生",
        "optionsFrom": "doctors"
      }
    ],
    "actions": [
      {
        "label": "日历视图",
        "variant": "secondary"
      },
      {
        "label": "列表视图",
        "variant": "secondary"
      },
      {
        "label": "批量排班",
        "variant": "secondary",
        "modal": "modal-batch-schedule"
      },
      {
        "label": "新增排班",
        "variant": "primary",
        "modal": "modal-create-schedule"
      }
    ],
    "columns": [],
    "formFields": [],
    "rowActions": [],
    "pagination": false,
    "readOnly": false,
    "sections": []
  }
];

export const sidebarChrome = {
  "nodeId": "280:2024",
  "width": 1440,
  "brandTitle": "阳光医疗门诊",
  "brandSubtitle": "预约挂号管理后台",
  "groups": [
    {
      "id": "clinic",
      "label": "",
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
      "id": "operations",
      "label": "系统运营",
      "items": [
        "地址管理",
        "广告图管理",
        "公告管理",
        "新闻列表",
        "新闻分类",
        "导航栏",
        "意见反馈",
        "预约规则",
        "消息通知"
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
    "name": "新增科室弹窗",
    "screen": "科室管理",
    "trigger": "新增",
    "fields": [
      {
        "key": "name",
        "label": "科室名称",
        "type": "text",
        "required": true,
        "placeholder": "请输入科室名称"
      },
      {
        "key": "icon",
        "label": "科室图标",
        "type": "upload",
        "required": true,
        "placeholder": "上传图标",
        "hint": "建议尺寸 200×200px；支持 PNG / JPG / SVG，不超过 2MB；用于小程序科室列表展示"
      },
      {
        "key": "description",
        "label": "科室描述",
        "type": "textarea",
        "placeholder": "请输入科室描述"
      },
      {
        "key": "sort",
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
          }
        ]
      }
    ],
    "footer": {
      "cancel": "取消",
      "ok": "确定"
    },
    "nodeId": "157:4177"
  },
  {
    "name": "新增医生弹窗",
    "screen": "医生管理",
    "trigger": "新增",
    "fields": [
      {
        "key": "avatar",
        "label": "医生头像",
        "type": "upload",
        "placeholder": "上传头像",
        "hint": "建议尺寸 200×200px；支持 JPG、PNG，最大 2MB"
      },
      {
        "key": "name",
        "label": "医生姓名",
        "type": "text",
        "required": true,
        "placeholder": "请输入姓名"
      },
      {
        "key": "title",
        "label": "职称",
        "type": "select",
        "required": true,
        "options": [
          {
            "value": "chief",
            "label": "主任医师"
          }
        ]
      },
      {
        "key": "deptId",
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
        "key": "years",
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
        "type": "text",
        "placeholder": "逗号分隔"
      },
      {
        "key": "status",
        "label": "状态",
        "type": "select",
        "options": [
          {
            "value": "active",
            "label": "在诊"
          }
        ]
      }
    ],
    "footer": {
      "cancel": "取消",
      "ok": "确定"
    },
    "nodeId": "157:4212"
  },
  {
    "name": "新增排班弹窗",
    "screen": "排班管理",
    "trigger": "新增",
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
            "value": "am",
            "label": "上午 (08:00 - 12:00)"
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
            "value": "open",
            "label": "可预约"
          }
        ]
      },
      {
        "key": "remark",
        "label": "备注",
        "type": "text",
        "placeholder": "如：仅限复诊患者、专家门诊等"
      }
    ],
    "footer": {
      "cancel": "取消",
      "ok": "确定"
    },
    "nodeId": "176:4"
  },
  {
    "name": "批量排班弹窗",
    "screen": "排班管理",
    "trigger": "批量",
    "fields": [
      {
        "key": "templateType",
        "label": "模板类型",
        "type": "select",
        "required": true,
        "options": [
          {
            "value": "week",
            "label": "按周模板（本周/下周）"
          }
        ]
      },
      {
        "key": "doctorIds",
        "label": "选择医生",
        "type": "select",
        "required": true,
        "multiple": true,
        "relatedResource": "doctors",
        "relatedLabelKey": "name"
      },
      {
        "key": "weekdays",
        "label": "选择排班日期",
        "type": "select",
        "required": true,
        "multiple": true,
        "options": [
          {
            "value": "mon",
            "label": "周一"
          },
          {
            "value": "tue",
            "label": "周二"
          },
          {
            "value": "wed",
            "label": "周三"
          },
          {
            "value": "thu",
            "label": "周四"
          },
          {
            "value": "fri",
            "label": "周五"
          },
          {
            "value": "sat",
            "label": "周六"
          },
          {
            "value": "sun",
            "label": "周日"
          }
        ]
      },
      {
        "key": "weekRange",
        "label": "生效周范围",
        "type": "select",
        "required": true,
        "options": [
          {
            "value": "thisWeek",
            "label": "本周（8月10日 - 8月16日）"
          }
        ]
      },
      {
        "key": "slot",
        "label": "时段",
        "type": "select",
        "required": true,
        "options": [
          {
            "value": "am",
            "label": "上午 (08:00 - 12:00)"
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
            "value": "open",
            "label": "可预约"
          }
        ]
      }
    ],
    "preview": {
      "title": "生成预览：",
      "note": "预计生成 30 条排班记录（6 位医生 × 5 天）"
    },
    "footer": {
      "cancel": "取消",
      "ok": "确认生成"
    },
    "nodeId": "176:46"
  }
];

export function getScreenByRoute(route: string): ScreenConfig | undefined {
  return screenConfigs.find((s) => s.route === route);
}
