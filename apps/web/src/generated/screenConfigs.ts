/* Generated from Visual IR + app-spec.json (brand / screens[].sample). Re-run: node scripts/generate-screen-configs.mjs */
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
  optionsFrom?: string; // 关联资源的下拉数据源（如 departments/doctors），页面层解析
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
  /**
   * 闸门冻结样本：**spec 声明**（app-spec.json → screens[].sample），由生成器原样下发。
   * gate 模式下页面用它替代接口数据，保证与原型标杆逐字一致；页面不得自带副本。
   */
  sample?: Record<string, unknown>;
}

export const brand = {
  "title": "阳光医疗门诊",
  "subtitle": "预约挂号管理后台"
};

export const screenConfigs: ScreenConfig[] = [
  {
    "name": "首页",
    "nodeId": "157:2",
    "route": "/",
    "template": "dashboard",
    "resource": "dashboard",
    "needsReview": false,
    "sample": {
      "stats": {
        "appointments": 106,
        "visitRate": "96.2%",
        "noshowRate": "3.8%",
        "revenue": "¥5,280"
      },
      "charts": {
        "trend": {
          "labels": [
            "8/1",
            "8/2",
            "8/3",
            "8/4",
            "8/5",
            "8/6",
            "今日"
          ],
          "values": [
            12,
            8,
            15,
            10,
            18,
            22,
            5
          ]
        },
        "deptBars": {
          "labels": [
            "内科",
            "妇科",
            "儿科",
            "口腔科",
            "皮肤科"
          ],
          "values": [
            38,
            25,
            20,
            15,
            8
          ]
        },
        "income": {
          "labels": [
            "8/1",
            "8/2",
            "8/3",
            "8/4",
            "8/5",
            "8/6",
            "今日"
          ],
          "values": [
            360,
            240,
            450,
            300,
            540,
            660,
            150
          ]
        }
      }
    },
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
    "sample": {
      "stats": {
        "departments": 6,
        "doctors": 6,
        "pending": 0,
        "ordersToday": 0
      },
      "blankStats": {
        "departments": 0,
        "doctors": 0,
        "pending": 0,
        "ordersToday": 0
      },
      "org": {
        "name": "阳光医疗门诊",
        "phone": "010-8888 8888",
        "subtitle": "以患者为中心 · 专业守护健康",
        "hours": "周一至周日 08:00-17:30",
        "address": "北京市示范区健康路 88 号",
        "intro": "正规医疗机构，拥有专业医疗团队，为患者提供贴心、便捷的门诊服务。"
      }
    },
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
    "sample": {
      "stats": {
        "departments": 6,
        "doctors": 6,
        "pending": 0,
        "ordersToday": 0
      },
      "rows": [
        {
          "id": 1,
          "name": "内科",
          "description": "重症、发热、咳嗽等",
          "sort": 1,
          "status": "active",
          "doctorCount": 2
        },
        {
          "id": 2,
          "name": "儿科",
          "description": "儿童保健、常见疾病",
          "sort": 2,
          "status": "active",
          "doctorCount": 10
        },
        {
          "id": 3,
          "name": "妇科",
          "description": "妇科炎症、月经不调",
          "sort": 3,
          "status": "active",
          "doctorCount": 6
        },
        {
          "id": 4,
          "name": "口腔科",
          "description": "牙痛、龋齿、牙周炎",
          "sort": 4,
          "status": "active",
          "doctorCount": 1
        },
        {
          "id": 5,
          "name": "皮肤科",
          "description": "皮炎、湿疹、过敏等",
          "sort": 5,
          "status": "active",
          "doctorCount": 1
        }
      ]
    },
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
    "sample": {
      "stats": {
        "departments": 6,
        "doctors": 6,
        "pending": 0,
        "ordersToday": 0
      },
      "rows": [
        {
          "id": 1,
          "name": "张伟",
          "title": "副主任医师",
          "deptId": "1",
          "specialty": "高血压、糖尿病、冠心病等慢性病...",
          "years": 15,
          "goodRate": 99,
          "fee": 30,
          "status": "active"
        },
        {
          "id": 2,
          "name": "李娜",
          "title": "主任医师 副教授",
          "deptId": "3",
          "specialty": "妇科炎症、月经不调、宫颈疾病、...",
          "years": 16,
          "goodRate": 99,
          "fee": 30,
          "status": "active"
        },
        {
          "id": 3,
          "name": "王磊",
          "title": "主治医师",
          "deptId": "2",
          "specialty": "儿童感冒、咳嗽、发热等常见病",
          "years": 10,
          "goodRate": 98,
          "fee": 25,
          "status": "active"
        },
        {
          "id": 4,
          "name": "王磊",
          "title": "主治医师",
          "deptId": "4",
          "specialty": "牙体牙髓、牙周疾病",
          "years": 9,
          "goodRate": 98,
          "fee": 35,
          "status": "active"
        }
      ]
    },
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
    "sample": {
      "month": "2026-08",
      "today": "2026-08-10",
      "schedules": [
        {
          "id": 1,
          "doctorId": 1,
          "doctorName": "张伟",
          "workDate": "2026-08-10",
          "slot": "am",
          "quota": 30,
          "booked": 12,
          "status": "open"
        },
        {
          "id": 2,
          "doctorId": 1,
          "doctorName": "张伟",
          "workDate": "2026-08-10",
          "slot": "pm",
          "quota": 20,
          "booked": 20,
          "status": "open"
        },
        {
          "id": 3,
          "doctorId": 2,
          "doctorName": "李娜",
          "workDate": "2026-08-10",
          "slot": "am",
          "quota": 40,
          "booked": 15,
          "status": "open",
          "tone": "open"
        },
        {
          "id": 4,
          "doctorId": 3,
          "doctorName": "王磊",
          "workDate": "2026-08-11",
          "slot": "am",
          "quota": 25,
          "booked": 5,
          "status": "open"
        },
        {
          "id": 5,
          "doctorId": 2,
          "doctorName": "李娜",
          "workDate": "2026-08-11",
          "slot": "am",
          "quota": 20,
          "booked": 8,
          "status": "open"
        },
        {
          "id": 6,
          "doctorId": 3,
          "doctorName": "陈静",
          "workDate": "2026-08-11",
          "slot": "am",
          "quota": 30,
          "booked": 10,
          "status": "open",
          "tone": "open"
        },
        {
          "id": 7,
          "doctorId": 4,
          "doctorName": "刘洋",
          "workDate": "2026-08-12",
          "slot": "am",
          "quota": 20,
          "booked": 0,
          "status": "open"
        },
        {
          "id": 8,
          "doctorId": 5,
          "doctorName": "赵强",
          "workDate": "2026-08-12",
          "slot": "pm",
          "quota": 15,
          "booked": 7,
          "status": "open"
        },
        {
          "id": 9,
          "doctorId": 1,
          "doctorName": "张伟",
          "workDate": "2026-08-14",
          "slot": "am",
          "quota": 50,
          "booked": 30,
          "status": "open",
          "tone": "open"
        },
        {
          "id": 10,
          "doctorId": 4,
          "doctorName": "刘洋",
          "workDate": "2026-08-10",
          "slot": "pm",
          "quota": 20,
          "booked": 3,
          "status": "open"
        },
        {
          "id": 11,
          "doctorId": 5,
          "doctorName": "赵强",
          "workDate": "2026-08-10",
          "slot": "am",
          "quota": 20,
          "booked": 6,
          "status": "open"
        },
        {
          "id": 12,
          "doctorId": 3,
          "doctorName": "王磊",
          "workDate": "2026-08-10",
          "slot": "pm",
          "quota": 25,
          "booked": 9,
          "status": "open"
        },
        {
          "id": 13,
          "doctorId": 2,
          "doctorName": "李娜",
          "workDate": "2026-08-10",
          "slot": "pm",
          "quota": 40,
          "booked": 11,
          "status": "open"
        }
      ],
      "doctorOptions": [
        {
          "id": 1,
          "name": "张伟"
        },
        {
          "id": 2,
          "name": "李娜"
        },
        {
          "id": 3,
          "name": "王磊"
        },
        {
          "id": 4,
          "name": "陈静"
        },
        {
          "id": 5,
          "name": "刘洋"
        },
        {
          "id": 6,
          "name": "赵强"
        }
      ],
      "createModal": {
        "workDate": "2026-08-10"
      },
      "batchModal": {
        "dates": [
          "2026-08-09",
          "2026-08-10",
          "2026-08-11",
          "2026-08-12",
          "2026-08-13"
        ],
        "slotLabel": "上午",
        "note": "预计生成 30 条排班记录（6 位医生 × 5 天）"
      }
    },
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

export const sidebarItems: Array<{ label: string; icon: string; route: string | null; badge: string | null }> = [
  {
    "label": "首页",
    "icon": "首页",
    "route": "/",
    "badge": null
  },
  {
    "label": "机构信息",
    "icon": "机构信息",
    "route": "/organization",
    "badge": null
  },
  {
    "label": "科室管理",
    "icon": "科室管理",
    "route": "/departments",
    "badge": null
  },
  {
    "label": "医生管理",
    "icon": "医生管理",
    "route": "/doctors",
    "badge": null
  },
  {
    "label": "排班管理",
    "icon": "排班管理",
    "route": "/schedules",
    "badge": null
  },
  {
    "label": "预约记录",
    "icon": "预约记录",
    "route": null,
    "badge": "3"
  },
  {
    "label": "患者管理",
    "icon": "患者管理",
    "route": null,
    "badge": null
  },
  {
    "label": "订单管理",
    "icon": "订单管理",
    "route": null,
    "badge": null
  },
  {
    "label": "评价管理",
    "icon": "评价管理",
    "route": null,
    "badge": null
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
    }
  ],
  "badges": {
    "预约记录": "3"
  }
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
