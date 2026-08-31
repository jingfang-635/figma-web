import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(base: Date, n: number) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

function atHour(dateStr: string, hour: number, minute = 0) {
  return new Date(`${dateStr}T${pad(hour)}:${pad(minute)}:00+08:00`);
}

async function reset() {
  await prisma.operationLog.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.navItem.deleteMany({ where: { parentId: { not: null } } });
  await prisma.navItem.deleteMany();
  await prisma.news.deleteMany();
  await prisma.newsCategory.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.address.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.review.deleteMany();
  await prisma.order.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.department.deleteMany();
  await prisma.appointmentRule.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
}

async function main() {
  await reset();

  const adminRole = await prisma.role.create({
    data: { name: '超级管理员', description: '拥有所有权限', status: 'active' },
  });
  const staffRole = await prisma.role.create({
    data: { name: '运营人员', description: '内容管理、排班管理、订单管理', status: 'active' },
  });

  const adminPassword = await bcrypt.hash('admin123', 10);
  const staffPassword = await bcrypt.hash('staff123', 10);

  await prisma.user.createMany({
    data: [
      {
        email: 'admin@sunshine.clinic',
        password: adminPassword,
        name: '系统管理员',
        username: 'admin',
        phone: '13800000000',
        status: 'active',
        roleId: adminRole.id,
      },
      {
        email: 'staff@sunshine.clinic',
        password: staffPassword,
        name: '李护士',
        username: 'nurse_li',
        phone: '13900000000',
        status: 'active',
        roleId: staffRole.id,
      },
      {
        email: 'front@sunshine.clinic',
        password: staffPassword,
        name: '王前台',
        username: 'front_wang',
        phone: '13700000000',
        status: 'active',
        roleId: staffRole.id,
      },
    ],
  });

  await prisma.organization.create({
    data: {
      name: '阳光医疗门诊',
      subtitle: '以患者为中心·专业守护健康',
      address: '北京市示范区健康路 88 号',
      phone: '010-8888 8888',
      email: 'contact@sunshine.clinic',
      description:
        '正规医疗机构，拥有专业医疗团队，为患者提供贴心、便捷的门诊服务。',
      businessHours: '周一至周日 08:00-17:30',
    },
  });

  const deptRows = await Promise.all(
    [
      { name: '内科', code: 'NK', description: '重症、发热、咳嗽等', sortOrder: 1, status: 'active' },
      { name: '儿科', code: 'EK', description: '儿童保健、常见疾病', sortOrder: 2, status: 'active' },
      { name: '妇科', code: 'FK', description: '妇科炎症、月经不调', sortOrder: 3, status: 'active' },
      { name: '口腔科', code: 'KQ', description: '牙痛、龋齿、牙周炎', sortOrder: 4, status: 'active' },
      { name: '皮肤科', code: 'PF', description: '皮炎、湿疹、过敏等', sortOrder: 5, status: 'active' },
      { name: '康复科', code: 'KF', description: '暂未开放线上预约', sortOrder: 6, status: 'inactive' },
    ].map((d) => prisma.department.create({ data: d })),
  );

  const [internalMed, pediatrics, gynecology, dental, dermatology] = deptRows;

  const doctors = await Promise.all(
    [
      { name: '张伟', title: '副主任医师', departmentId: internalMed.id, phone: '13800138001', avatar: '/assets/doctors/zhangwei.png', specialty: '高血压、糖尿病、冠心病等慢性病', fee: 30, experienceYears: 15, goodRate: 99, status: 'active' },
      { name: '陈思远', title: '副主任医师', departmentId: internalMed.id, phone: '13800138002', avatar: '/assets/doctors/chensiyuan.png', specialty: '呼吸内科', fee: 30, experienceYears: 12, goodRate: 98, status: 'active' },
      { name: '赵明', title: '主治医师', departmentId: internalMed.id, phone: '13800138003', avatar: '/assets/doctors/zhaoming.png', specialty: '消化内科', fee: 25, experienceYears: 9, goodRate: 97, status: 'active' },
      { name: '李娜', title: '主任医师 副教授', departmentId: gynecology.id, phone: '13800138004', avatar: '/assets/doctors/lina.png', specialty: '妇科炎症、月经不调、宫颈疾病', fee: 30, experienceYears: 16, goodRate: 99, status: 'active' },
      { name: '周小雨', title: '主治医师', departmentId: pediatrics.id, phone: '13800138005', avatar: '/assets/doctors/zhouxiaoyu.png', specialty: '儿童保健', fee: 25, experienceYears: 8, goodRate: 98, status: 'active' },
      { name: '王芳', title: '主任医师', departmentId: gynecology.id, phone: '13800138006', avatar: '/assets/doctors/wangfang.png', specialty: '妇科内分泌', fee: 35, experienceYears: 20, goodRate: 99, status: 'active' },
      { name: '刘婷', title: '主治医师', departmentId: gynecology.id, phone: '13800138007', avatar: '/assets/doctors/liuting.png', specialty: '妇科炎症', fee: 25, experienceYears: 7, goodRate: 97, status: 'active' },
      { name: '孙浩', title: '副主任医师', departmentId: dental.id, phone: '13800138008', avatar: '/assets/doctors/sunhao.png', specialty: '牙体牙髓、牙周疾病', fee: 35, experienceYears: 9, goodRate: 98, status: 'active' },
      { name: '吴倩', title: '主治医师', departmentId: dental.id, phone: '13800138009', avatar: '/assets/doctors/wuqian.png', specialty: '口腔修复', fee: 35, experienceYears: 6, goodRate: 97, status: 'active' },
      { name: '郑晓燕', title: '主任医师', departmentId: dermatology.id, phone: '13800138010', avatar: '/assets/doctors/zhengxiaoyan.png', specialty: '过敏性皮炎', fee: 30, experienceYears: 18, goodRate: 99, status: 'active' },
      { name: '黄磊', title: '主治医师', departmentId: dermatology.id, phone: '13800138011', avatar: '/assets/doctors/huanglei.png', specialty: '痤疮、湿疹', fee: 25, experienceYears: 5, goodRate: 95, status: 'inactive' },
    ].map((d) => prisma.doctor.create({ data: d })),
  );

  const activeDoctors = doctors.filter((d) => d.status === 'active');

  const patients = await Promise.all(
    [
      { name: '王小明', phone: '13900139001', idCard: '110101199001011234', gender: '男', age: 36, address: '北京市海淀区中关村大街1号', tags: 'VIP', status: 'active' },
      { name: '刘芳', phone: '13900139002', idCard: '110101198505052345', gender: '女', age: 41, address: '北京市朝阳区建国路99号', tags: '慢性病患者', status: 'active' },
      { name: '陈建国', phone: '13900139003', idCard: '110101197808083456', gender: '男', age: 48, address: '北京市西城区西单北大街12号', tags: '慢性病患者', status: 'active' },
      { name: '赵敏', phone: '13900139004', idCard: '110101199203034567', gender: '女', age: 34, address: '北京市东城区东四十条8号', tags: '', status: 'active' },
      { name: '孙丽', phone: '13900139005', idCard: '110101201201015678', gender: '女', age: 8, address: '北京市朝阳区望京西园三区', tags: '', status: 'active' },
      { name: '周杰', phone: '13900139006', idCard: '110101196612126789', gender: '男', age: 59, address: '北京市丰台区南三环西路', tags: '黑名单', status: 'blacklisted' },
      { name: '吴佳', phone: '13900139007', idCard: '110101199812127890', gender: '女', age: 27, address: '北京市海淀区学院路38号', tags: '', status: 'active' },
      { name: '郑浩', phone: '13900139008', idCard: '110101199509098901', gender: '男', age: 31, address: '北京市通州区新华大街', tags: '', status: 'active' },
      { name: '冯雪', phone: '13900139009', idCard: '110101198211110012', gender: '女', age: 44, address: '北京市昌平区回龙观', tags: '', status: 'active' },
      { name: '韩磊', phone: '13900139010', idCard: '110101200103031123', gender: '男', age: 25, address: '北京市大兴区亦庄', tags: '', status: 'active' },
      { name: '曹颖', phone: '13900139011', idCard: '110101201605052234', gender: '女', age: 10, address: '北京市朝阳区酒仙桥', tags: '', status: 'active' },
      { name: '马强', phone: '13900139012', idCard: '110101197303033345', gender: '男', age: 53, address: '北京市石景山区鲁谷', tags: '', status: 'active' },
    ].map((p) => prisma.patient.create({ data: p })),
  );

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayStr = ymd(today);
  const slots = [
    { startTime: '08:30', endTime: '12:00', quota: 20 },
    { startTime: '14:00', endTime: '17:30', quota: 16 },
  ];

  const scheduleData: Array<{
    doctorId: number;
    date: string;
    startTime: string;
    endTime: string;
    quota: number;
    status: string;
  }> = [];

  for (let offset = -12; offset <= 18; offset++) {
    const day = addDays(today, offset);
    const date = ymd(day);
    const dow = day.getDay();
    const perDay = dow === 0 ? 2 : dow === 6 ? 3 : 4;
    for (let i = 0; i < perDay; i++) {
      const doctor = activeDoctors[(Math.abs(offset) * 3 + i * 2 + dow) % activeDoctors.length];
      const slot = slots[i % 2];
      let status = 'available';
      if (offset < -1 && i === 0) status = 'full';
      if (dow === 0 && i === 1) status = 'cancelled';
      scheduleData.push({
        doctorId: doctor.id,
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        quota: slot.quota,
        status,
      });
    }
  }

  await prisma.schedule.createMany({ data: scheduleData });
  const schedules = await prisma.schedule.findMany({ orderBy: { id: 'asc' } });

  const apptStatusesPast = ['completed', 'completed', 'completed', 'cancelled', 'completed'] as const;
  const apptStatusesToday = ['completed', 'confirmed', 'pending', 'pending'] as const;
  const apptStatusesFuture = ['confirmed', 'pending'] as const;

  const appointmentData: Array<{
    appointmentNo: string;
    patientName: string;
    patientPhone: string;
    doctorId: number;
    scheduleId: number;
    status: string;
    appointmentDate: string;
    amount: number;
  }> = [];

  const feeByDoctor = new Map(doctors.map((d) => [d.id, d.fee ?? 30]));
  let apptSeq = 1;
  let apptIndex = 0;
  for (const sch of schedules) {
    if (sch.status === 'cancelled') continue;
    const cmp = sch.date.localeCompare(todayStr);
    let count = 0;
    if (cmp < 0) count = sch.status === 'full' ? 3 : 2;
    else if (cmp === 0) count = 3;
    else if (apptIndex % 3 !== 0) count = 1;
    for (let i = 0; i < count; i++) {
      const patient = patients[(apptIndex + i) % patients.length];
      let status: string;
      if (cmp < 0) status = apptStatusesPast[(apptIndex + i) % apptStatusesPast.length];
      else if (cmp === 0) status = apptStatusesToday[i % apptStatusesToday.length];
      else status = apptStatusesFuture[i % apptStatusesFuture.length];
      appointmentData.push({
        appointmentNo: `AP${sch.date.replace(/-/g, '')}${pad(apptSeq)}`,
        patientName: patient.name,
        patientPhone: patient.phone,
        doctorId: sch.doctorId,
        scheduleId: sch.id,
        status,
        appointmentDate: sch.date,
        amount: feeByDoctor.get(sch.doctorId) ?? 30,
      });
      apptSeq += 1;
    }
    apptIndex += 1;
  }

  await prisma.appointment.createMany({ data: appointmentData });

  const orderTypes = [
    { type: '挂号', amount: 50 },
    { type: '挂号', amount: 80 },
    { type: '咨询', amount: 120 },
    { type: '药品', amount: 186.5 },
    { type: '药品', amount: 268 },
    { type: '体检', amount: 399 },
    { type: '体检', amount: 680 },
  ];
  const orderStatuses = ['paid', 'paid', 'paid', 'pending', 'refunded'] as const;

  const orderData: Array<{
    orderNo: string;
    patientId: number;
    doctorName: string;
    department: string;
    amount: number;
    status: string;
    type: string;
    payMethod: string;
    paidAt: Date | null;
    createdAt: Date;
  }> = [];

  const deptNameById = new Map(deptRows.map((d) => [d.id, d.name]));
  const payMethods = ['微信支付', '微信支付', '支付宝', '微信支付', '支付宝'] as const;
  let orderSeq = 1;
  for (let offset = -6; offset <= 0; offset++) {
    const date = ymd(addDays(today, offset));
    const perDay = 4 + (offset === 0 ? 2 : offset % 2 === 0 ? 1 : 0);
    for (let i = 0; i < perDay; i++) {
      const tpl = orderTypes[(orderSeq + i) % orderTypes.length];
      const doctor = activeDoctors[(orderSeq + i) % activeDoctors.length];
      const st = orderStatuses[(orderSeq + i) % orderStatuses.length];
      const createdAt = atHour(date, 9 + i, 15);
      orderData.push({
        orderNo: `ORD${date.replace(/-/g, '')}${pad(orderSeq)}`,
        patientId: patients[(orderSeq + i) % patients.length].id,
        doctorName: doctor.name,
        department: deptNameById.get(doctor.departmentId) ?? '',
        amount: tpl.amount + i * 12,
        status: st,
        type: tpl.type,
        payMethod: payMethods[(orderSeq + i) % payMethods.length],
        paidAt: st === 'paid' || st === 'refunded' ? createdAt : null,
        createdAt,
      });
      orderSeq += 1;
    }
  }
  await prisma.order.createMany({ data: orderData });

  await prisma.review.createMany({
    data: [
      { patientName: '王小明', doctorId: doctors[0].id, rating: 5, content: '张医生非常耐心，诊断准确，服务态度很好。', status: 'published' },
      { patientName: '刘芳', doctorId: doctors[5].id, rating: 5, content: '王芳医生讲解细致，检查过程很安心。', status: 'published' },
      { patientName: '孙丽', doctorId: doctors[3].id, rating: 4, content: '李娜医生对小朋友很温柔，候诊稍久。', status: 'published' },
      { patientName: '陈建国', doctorId: doctors[1].id, rating: 5, content: '咳嗽好得很快，用药建议很实用。', status: 'published' },
      { patientName: '周杰', doctorId: doctors[7].id, rating: 4, content: '补牙过程不太痛，价格透明。', status: 'published' },
      { patientName: '吴佳', doctorId: doctors[9].id, rating: 5, content: '皮肤问题明显好转，会再来复诊。', status: 'published' },
      { patientName: '郑浩', doctorId: doctors[2].id, rating: 3, content: '整体还行，就是排队有点长。', status: 'pending' },
      { patientName: '冯雪', doctorId: doctors[6].id, rating: 2, content: '等待时间过长，希望能优化叫号。', status: 'hidden' },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { title: '预约成功通知', content: '您已成功预约，请按时就诊。', type: '微信模板', triggerScene: '患者预约成功后', status: 'active', targetUser: 'patients' },
      { title: '就诊提醒', content: '您预约的{{date}} {{time}} {{doctor}}医生就诊，请准时到院。', type: '短信', triggerScene: '就诊前1天', status: 'active', targetUser: 'patients' },
      { title: '停诊通知', content: '{{doctor}}医生因故停诊，您的预约已调整，请见谅。', type: '微信模板', triggerScene: '医生停诊时', status: 'active', targetUser: 'patients' },
      { title: '取消预约通知', content: '您的预约已取消，如需就诊请重新预约。', type: '短信', triggerScene: '预约被取消时', status: 'inactive', targetUser: 'patients' },
    ],
  });

  await prisma.notificationLog.createMany({
    data: [
      { receiver: '刘芳', template: '就诊提醒', contentSummary: '您预约的2026-08-07 09:00张伟医生就诊...', sentAt: new Date('2026-08-06T09:00:00+08:00'), status: 'sent' },
      { receiver: '陈明', template: '就诊提醒', contentSummary: '您预约的2026-08-07 10:00李娜医生就诊...', sentAt: new Date('2026-08-06T09:00:00+08:00'), status: 'sent' },
      { receiver: '王小明', template: '预约成功通知', contentSummary: '您已成功预约2026-08-08 14:00王芳医生...', sentAt: new Date('2026-08-05T15:30:00+08:00'), status: 'sent' },
      { receiver: '赵敏', template: '停诊通知', contentSummary: '李娜医生因故停诊，您的预约已调整，请见谅。', sentAt: new Date('2026-08-04T10:12:00+08:00'), status: 'sent' },
      { receiver: '周杰', template: '取消预约通知', contentSummary: '您的预约已取消，如需就诊请重新预约。', sentAt: new Date('2026-08-03T18:45:00+08:00'), status: 'failed' },
    ],
  });

  await prisma.address.createMany({
    data: [
      { name: '王小明', phone: '13900139001', province: '北京市', city: '北京市', district: '海淀区', detail: '中关村大街1号', isDefault: true },
      { name: '刘芳', phone: '13900139002', province: '北京市', city: '北京市', district: '朝阳区', detail: '建国路99号', isDefault: true },
      { name: '陈建国', phone: '13900139003', province: '北京市', city: '北京市', district: '西城区', detail: '西单北大街12号', isDefault: false },
      { name: '赵敏', phone: '13900139004', province: '北京市', city: '北京市', district: '东城区', detail: '东四十条8号', isDefault: true },
      { name: '周杰', phone: '13900139006', province: '北京市', city: '北京市', district: '丰台区', detail: '南三环西路88号', isDefault: true },
    ],
  });

  await prisma.banner.createMany({
    data: [
      { title: '秋季健康体检优惠', imageUrl: '/assets/banners/health-check.png', linkUrl: '/promotions/health-check', sortOrder: 1, status: 'active' },
      { title: '儿科晚间门诊开放', imageUrl: '/assets/banners/pediatrics.png', linkUrl: '/departments', sortOrder: 2, status: 'active' },
      { title: '口腔洁牙套餐', imageUrl: '/assets/banners/dental.png', linkUrl: '/promotions/dental', sortOrder: 3, status: 'active' },
      { title: '旧版周年庆海报', imageUrl: '/assets/banners/legacy.png', linkUrl: '', sortOrder: 4, status: 'inactive' },
    ],
  });

  await prisma.announcement.createMany({
    data: [
      {
        title: '关于国庆节期间门诊安排的通知',
        content: '国庆节期间（10月1日-10月7日）门诊正常开放，急诊 24 小时接诊。',
        publisher: 'admin',
        status: 'published',
        publishAt: new Date('2026-09-28T10:00:00+08:00'),
      },
      {
        title: '关于系统升级维护的通知',
        content: '系统将于本周六凌晨进行升级维护，期间预约功能暂停使用。',
        publisher: 'admin',
        status: 'published',
        publishAt: atHour(todayStr, 9),
      },
      {
        title: '新版预约规则草案',
        content: '拟将可提前预约天数调整为 14 天，内部评审中，暂不对外发布。',
        publisher: 'admin',
        status: 'draft',
        publishAt: null,
      },
    ],
  });

  const newsHealth = await prisma.newsCategory.create({
    data: { name: '健康资讯', image: '/assets/news/health.png', sortOrder: 1, status: 'active' },
  });
  const newsClinic = await prisma.newsCategory.create({
    data: { name: '诊所动态', image: '/assets/news/clinic.png', sortOrder: 2, status: 'active' },
  });
  await prisma.newsCategory.create({
    data: { name: '政策公告', image: '/assets/news/policy.png', sortOrder: 3, status: 'inactive' },
  });

  await prisma.news.createMany({
    data: [
      {
        title: '秋季如何预防呼吸道疾病',
        content: '随着天气转凉，呼吸道疾病进入高发期。建议注意保暖、勤洗手、保持室内通风。',
        smallImage: '/assets/news/respiratory-sm.png',
        largeImage: '/assets/news/respiratory-lg.png',
        type: '图文',
        categoryId: newsHealth.id,
        status: 'published',
        publishAt: new Date('2026-08-20T10:00:00+08:00'),
      },
      {
        title: '儿童换季护理要点',
        content: '换季时儿童容易出现过敏与感冒，家长需关注饮食清淡、作息规律，出现发热及时就诊。',
        smallImage: '/assets/news/kids-sm.png',
        largeImage: '/assets/news/kids-lg.png',
        type: '图文',
        categoryId: newsHealth.id,
        status: 'published',
        publishAt: new Date('2026-08-22T10:00:00+08:00'),
      },
      {
        title: '阳光医疗引进新口腔设备',
        content: '本月口腔科完成数字化拍片设备升级，拍片等待时间缩短约 30%。',
        smallImage: '/assets/news/dental-sm.png',
        largeImage: '/assets/news/dental-lg.png',
        type: '视频',
        categoryId: newsClinic.id,
        status: 'published',
        publishAt: new Date('2026-08-24T10:00:00+08:00'),
      },
      {
        title: '女性健康科普讲座预告',
        content: '本周六下午妇科举办健康讲座，名额有限，请到前台报名。',
        smallImage: '/assets/news/health-talk-sm.png',
        largeImage: '/assets/news/health-talk-lg.png',
        type: '图文',
        categoryId: newsClinic.id,
        status: 'published',
        publishAt: atHour(todayStr, 8),
      },
      {
        title: '冬季体检套餐策划',
        content: '内部策划中的冬季体检套餐文案，尚未对外发布。',
        smallImage: '/assets/news/checkup-sm.png',
        largeImage: '/assets/news/checkup-lg.png',
        type: '图文',
        categoryId: newsHealth.id,
        status: 'draft',
        publishAt: null,
      },
    ],
  });

  const navHome = await prisma.navItem.create({
    data: { label: '首页', icon: '🏠', path: '/dashboard', params: '', sortOrder: 1, status: 'active' },
  });
  await prisma.navItem.create({
    data: { label: '预约管理', icon: '📅', path: '/appointments', params: '', sortOrder: 2, status: 'active' },
  });
  const navNews = await prisma.navItem.create({
    data: { label: '新闻资讯', icon: '📰', path: '/news', params: '', sortOrder: 3, status: 'active' },
  });
  await prisma.navItem.createMany({
    data: [
      { label: '健康资讯', icon: '', path: '/news?category=health', params: '', sortOrder: 1, status: 'active', parentId: navNews.id },
      { label: '诊所动态', icon: '', path: '/news?category=clinic', params: '', sortOrder: 2, status: 'active', parentId: navNews.id },
      { label: '个人中心', icon: '👤', path: '/profile', params: '', sortOrder: 4, status: 'active' },
      { label: '旧版活动页', icon: '', path: '/legacy', params: '72', sortOrder: 5, status: 'inactive' },
    ],
  });
  void navHome;

  await prisma.feedback.createMany({
    data: [
      { userName: '张患者', content: '希望增加夜间门诊服务', images: '', contact: '138****5678', status: 'pending' },
      { userName: '钱女士', content: '候诊区座位有点少，高峰期只能站着等。', images: '', contact: '13700137002', status: 'pending' },
      {
        userName: '孙先生',
        content: '小程序预约成功后短信有点晚。',
        images: '',
        contact: '13700137003',
        status: 'replied',
        reply: '已协调运营商，短信将在预约成功 1 分钟内送达。',
      },
      {
        userName: '李阿姨',
        content: '停车不太方便，能否和旁边商场协商优惠。',
        images: '',
        contact: '13700137004',
        status: 'replied',
        reply: '已与物业沟通，就诊患者可领取 2 小时停车券。',
      },
      { userName: '周同学', content: '希望儿科周末也能开通夜门诊。', images: '', contact: '13700137005', status: 'pending' },
    ],
  });

  await prisma.appointmentRule.createMany({
    data: [
      { name: '默认预约规则', advanceDays: 7, deadline: '17:00', cancelRule: '就诊前2小时可取消', noShowLimit: 3, cancelHours: 24, maxPerDay: 3, status: 'active' },
      { name: '儿科加号规则', advanceDays: 3, deadline: '16:00', cancelRule: '就诊前4小时可取消', noShowLimit: 3, cancelHours: 12, maxPerDay: 2, status: 'active' },
      { name: '节假日规则（停用）', advanceDays: 1, deadline: '12:00', cancelRule: '就诊前6小时可取消', noShowLimit: 3, cancelHours: 48, maxPerDay: 1, status: 'inactive' },
    ],
  });

  await prisma.operationLog.createMany({
    data: [
      { userName: '系统管理员', action: '初始化', module: '系统', detail: '演示数据写入完成', ip: '127.0.0.1' },
      { userName: '系统管理员', action: '登录', module: '认证', detail: '管理员登录后台', ip: '127.0.0.1' },
      { userName: '李护士', action: '新增', module: '排班', detail: '为张伟医生新增上午排班', ip: '192.168.1.21' },
      { userName: '王前台', action: '确认', module: '预约', detail: '确认患者王小明的预约', ip: '192.168.1.22' },
      { userName: '系统管理员', action: '发布', module: '公告', detail: '发布流感疫苗接种通知', ip: '127.0.0.1' },
      { userName: '李护士', action: '审核', module: '评价', detail: '通过刘芳对王芳医生的评价', ip: '192.168.1.21' },
      { userName: '王前台', action: '退款', module: '订单', detail: '处理周杰体检订单退款申请', ip: '192.168.1.22' },
      { userName: '系统管理员', action: '修改', module: '机构', detail: '更新诊所简介', ip: '127.0.0.1' },
    ],
  });

  const counts = {
    departments: await prisma.department.count(),
    doctors: await prisma.doctor.count(),
    patients: await prisma.patient.count(),
    schedules: await prisma.schedule.count(),
    appointments: await prisma.appointment.count(),
    orders: await prisma.order.count(),
    reviews: await prisma.review.count(),
    notifications: await prisma.notification.count(),
    notificationLogs: await prisma.notificationLog.count(),
  };

  console.log('阳光医疗演示数据已写入', counts);
  console.log('登录账号: admin@sunshine.clinic / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
