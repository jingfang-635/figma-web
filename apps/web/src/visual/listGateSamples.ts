/** Visual-gate frozen samples for list screens still on ResourceListPage. */

export const LIST_GATE_DEPTS = [
  { value: "1", label: "内科" },
  { value: "2", label: "儿科" },
  { value: "3", label: "妇科" },
  { value: "4", label: "口腔科" },
  { value: "5", label: "皮肤科" },
  { value: "6", label: "中医科" },
];

export const LIST_GATE_FORM: Record<string, Record<string, unknown>> = {
  "/appointment-rules": {
    advanceDays: 7,
    deadline: "17:00",
    cancelRule: "就诊前2小时可取消",
    noShowLimit: 3,
  },
};

export const LIST_GATE_KPI: Record<string, Record<string, string | number>> = {
  "/appointments": {
    departments: 6,
    doctors: 6,
    pendingAppointments: 3,
    todayAppointments: 3,
  },
  "/patients": {
    totalPatients: 286,
    todayNew: 5,
    monthAppointments: 106,
    blacklist: 2,
  },
  "/orders": {
    todayOrders: 3,
    todayIncome: "¥85",
    pendingRefunds: 0,
    monthIncome: "¥5,280",
  },
};

export const LIST_GATE_ROWS: Record<string, Record<string, unknown>[]> = {
  "/appointments": [
    { id: 1, appointmentNo: "AP20260807001", patientName: "刘芳", patientPhone: "13812346789", department: { name: "内科" }, doctor: { name: "张伟", department: { id: 1, name: "内科" }, departmentId: 1 }, appointmentDate: "2026-08-07", timeSlot: "09:00-09:30", amount: 30, status: "pending" },
    { id: 2, appointmentNo: "AP20260807002", patientName: "陈明", patientPhone: "13912348901", department: { name: "妇科" }, doctor: { name: "李娜", department: { id: 3, name: "妇科" }, departmentId: 3 }, appointmentDate: "2026-08-07", timeSlot: "10:00-10:30", amount: 30, status: "pending" },
    { id: 3, appointmentNo: "AP20260807003", patientName: "赵丽丽", patientPhone: "13612343456", department: { name: "儿科" }, doctor: { name: "王磊", department: { id: 2, name: "儿科" }, departmentId: 2 }, appointmentDate: "2026-08-07", timeSlot: "08:30-09:00", amount: 25, status: "pending" },
    { id: 4, appointmentNo: "AP20260806004", patientName: "孙伟", patientPhone: "13712347890", department: { name: "口腔科" }, doctor: { name: "王磊", department: { id: 4, name: "口腔科" }, departmentId: 4 }, appointmentDate: "2026-08-06", timeSlot: "14:00-14:30", amount: 35, status: "completed" },
    { id: 5, appointmentNo: "AP20260806005", patientName: "周敏", patientPhone: "13512340123", department: { name: "皮肤科" }, doctor: { name: "张伟", department: { id: 5, name: "皮肤科" }, departmentId: 5 }, appointmentDate: "2026-08-06", timeSlot: "15:30-16:00", amount: 30, status: "cancelled" },
  ],
  "/patients": [
    { id: 1, name: "刘芳", gender: "女", age: 32, phone: "13812346789", appointmentCount: 5, tags: "慢性病患者", createdAt: "2025-03-15", status: "active" },
    { id: 2, name: "陈明", gender: "男", age: 45, phone: "13912348901", appointmentCount: 12, tags: "VIP", createdAt: "2024-11-02", status: "active" },
    { id: 3, name: "周敏", gender: "女", age: 19, phone: "13512340123", appointmentCount: 6, tags: "黑名单", createdAt: "2025-09-05", status: "blacklisted" },
  ],
  "/orders": [
    { id: 1, orderNo: "ORD20260807001", patient: { name: "刘芳" }, doctorName: "张伟", department: "内科", amount: 30, status: "paid", paidAt: "2026-08-06 14:23", payMethod: "微信支付" },
    { id: 2, orderNo: "ORD20260807002", patient: { name: "陈明" }, doctorName: "李娜", department: "妇科", amount: 30, status: "paid", paidAt: "2026-08-06 16:05", payMethod: "微信支付" },
    { id: 3, orderNo: "ORD20260807003", patient: { name: "赵丽丽" }, doctorName: "王磊", department: "儿科", amount: 25, status: "paid", paidAt: "2026-08-07 08:12", payMethod: "支付宝" },
    { id: 4, orderNo: "ORD20260806005", patient: { name: "周敏" }, doctorName: "张伟", department: "皮肤科", amount: 30, status: "refunded", paidAt: "2026-08-06 10:30", payMethod: "微信支付" },
  ],
  "/reviews": [
    { id: 1, patientName: "刘芳", doctor: { name: "张伟" }, rating: 5, content: "张医生非常专业，态度很好，详细解释了病情和治疗方案", createdAt: "2026-08-06", status: "published" },
    { id: 2, patientName: "陈明", doctor: { name: "李娜" }, rating: 5, content: "李医生医术精湛，对妇科问题判断很准确，推荐！", createdAt: "2026-08-05", status: "published" },
    { id: 3, patientName: "孙伟", doctor: { name: "王磊" }, rating: 3, content: "排队时间有点长，医生看诊时间偏短", createdAt: "2026-08-04", status: "published" },
  ],
};
