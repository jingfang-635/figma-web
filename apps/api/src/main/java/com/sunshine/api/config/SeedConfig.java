package com.sunshine.api.config;

import com.sunshine.api.entity.*;
import com.sunshine.api.repository.*;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.LocalDate;
import java.util.List;

/**
 * Seed：闸门账号 + 原型可见的演示数据（字段值逐字来自 figma-fields）
 */
@Configuration
public class SeedConfig {

  @Bean
  ApplicationRunner seed(
      RoleRepository roles, UserRepository users,
      DepartmentRepository departments, DoctorRepository doctors,
      ScheduleRepository schedules, AppointmentRepository appointments,
      PatientRepository patients, OrderRepository orders,
      NotificationRepository notifications, AddressRepository addresses,
      BannerRepository banners, AnnouncementRepository announcements,
      NewsRepository news, NewsCategoryRepository newsCategories,
      NavItemRepository navItems, FeedbackRepository feedbacks,
      ReviewRepository reviews, AppointmentRuleRepository rules,
      OperationLogRepository logs) {
    return args -> {
      if (roles.count() > 0) return; // 已初始化

      // —— 角色 + 闸门账号 ——
      Role admin = new Role();
      admin.setName("超级管理员");
      admin.setDescription("拥有所有权限");
      roles.save(admin);
      Role operator = new Role();
      operator.setName("运营人员");
      operator.setDescription("内容管理、排班管理、订单管理");
      roles.save(operator);

      User u1 = new User();
      u1.setUsername("admin");
      u1.setPassword(new BCryptPasswordEncoder().encode("Admin@123456"));
      u1.setName("系统管理员");
      u1.setRole(admin);
      u1.setPhone("138****0000");
      users.save(u1);
      User u2 = new User();
      u2.setUsername("operator01");
      u2.setPassword(new BCryptPasswordEncoder().encode("Operator@123"));
      u2.setName("运营小张");
      u2.setRole(operator);
      u2.setPhone("139****1111");
      users.save(u2);

      // —— 科室（6 个启用，截图值）——
      var deptData = new String[][] {
          {"内科", "重症、发热、咳嗽等", "1"},
          {"儿科", "儿童保健、常见疾病", "2"},
          {"妇科", "妇科炎症、月经不调", "3"},
          {"口腔科", "牙痛、龋齿、牙周炎", "4"},
          {"皮肤科", "皮炎、湿疹、过敏等", "5"},
      };
      var savedDepts = new java.util.ArrayList<Department>();
      for (var row : deptData) {
        Department d = new Department();
        d.setName(row[0]);
        d.setDescription(row[1]);
        d.setSort(Integer.valueOf(row[2]));
        savedDepts.add(departments.save(d));
      }
      Department extra = new Department();
      extra.setName("眼科");
      extra.setDescription("眼部疾病诊治");
      extra.setSort(6);
      extra.setStatus("disabled");
      savedDepts.add(departments.save(extra));

      // —— 医生（截图值）——
      Doctor d1 = doctor(doctors, "张伟", "副主任医师", savedDepts.get(0), "高血压、糖尿病、冠心病等慢性病...", 15, 99, 30);
      Doctor d2 = doctor(doctors, "李娜", "主任医师 副教授", savedDepts.get(2), "妇科炎症、月经不调、宫颈疾病、...", 16, 99, 30);
      Doctor d3 = doctor(doctors, "王磊", "主治医师", savedDepts.get(1), "儿童感冒、咳嗽、发热等常见病", 10, 98, 25);
      Doctor d4 = doctor(doctors, "王磊2", "主治医师", savedDepts.get(3), "牙体牙髓、牙周疾病", 9, 98, 35);

      // —— 排班（近7天，匹配日历截图的 12/30 等占位）——
      LocalDate today = LocalDate.now();
      for (int i = 0; i < 7; i++) {
        String date = today.minusDays(3).plusDays(i).toString();
        schedule(schedules, d1, date, "am", 30, 12);
        schedule(schedules, d2, date, "pm", 40, 15);
      }

      // —— 患者 ——
      patient(patients, "刘芳", "女", 32, "138****6789", 5, "慢性病患者", "2025-03-15", "normal");
      patient(patients, "陈明", "男", 45, "139****8901", 12, "VIP", "2024-11-02", "normal");
      patient(patients, "周敏", "女", 19, "135****0123", 6, "黑名单", "2025-09-05", "blocked");

      // —— 预约记录（截图值）——
      appointment(appointments, "AP20260807001", "刘芳", "138****6789", savedDepts.get(0), d1, "2026-08-07", "09:00-09:30", 30, "pending");
      appointment(appointments, "AP20260807002", "陈明", "139****8901", savedDepts.get(2), d2, "2026-08-07", "10:00-10:30", 30, "pending");
      appointment(appointments, "AP20260807003", "赵丽丽", "136****3456", savedDepts.get(1), d3, "2026-08-07", "08:30-09:00", 25, "pending");
      appointment(appointments, "AP20260806004", "孙伟", "137****7890", savedDepts.get(3), d4, "2026-08-06", "14:00-14:30", 35, "visited");
      appointment(appointments, "AP20260806005", "周敏", "135****0123", savedDepts.get(4), d1, "2026-08-06", "15:30-16:00", 30, "cancelled");

      // —— 订单 ——
      order(orders, "ORD20260807001", "刘芳", d1, savedDepts.get(0), 3000, "paid", "2026-08-06 14:23", "微信支付");
      order(orders, "ORD20260807002", "陈明", d2, savedDepts.get(2), 3000, "paid", "2026-08-06 16:05", "微信支付");
      order(orders, "ORD20260807003", "赵丽丽", d3, savedDepts.get(1), 2500, "paid", "2026-08-07 08:12", "支付宝");
      order(orders, "ORD20260806005", "周敏", d1, savedDepts.get(4), 3000, "refunded", "2026-08-06 10:30", "微信支付");

      // —— 消息通知模板 ——
      notify(notifications, "预约成功通知", "微信模板", "患者预约成功后", "enabled");
      notify(notifications, "就诊提醒", "短信", "就诊前1天", "enabled");
      notify(notifications, "停诊通知", "微信模板", "医生停诊时", "enabled");
      notify(notifications, "取消预约通知", "短信", "预约被取消时", "disabled");

      // —— 新闻分类 ——
      var nc1 = newsCategory(newsCategories, 4, "协议");
      var nc2 = newsCategory(newsCategories, 3, "企业文化");
      newsCategory(newsCategories, 2, "公司相关");
      newsCategory(newsCategories, 1, "新闻资讯");

      // —— 新闻（截图标题）——
      news(news, "菌群移植前，为什么必须做一次肠道菌群检测？", nc1, "video", "2025-12-24 10:36:13");
      news(news, "菌群移植：不止治感染，更是慢病管理新思路", nc1, "video", "2025-12-24 10:27:47");
      news(news, "全球糖尿病流行态势严峻：2050年患者将达13亿", nc1, "article", "2025-12-24 09:13:13");
      news(news, "维护肠道菌群平衡，寻找预防和改善代谢疾病的新路径", nc2, "article", "2025-12-09 09:12:12");
      news(news, "国际胃肠研究预测：幽门螺杆菌感染与胃癌风险关联", nc2, "article", "2025-12-08 09:55:19");
      news(news, "从感染「幽门螺杆菌」到「胃癌」有多远？", nc2, "article", "2025-12-03 11:28:47");

      // —— 公告 ——
      announcement(announcements, "关于国庆节期间门诊安排的通知", "国庆节期间（10月1日-10月7日）门诊正常开放…", "2025-09-28 10:00:00", "admin");
      announcement(announcements, "关于系统升级维护的通知", "系统将于本周六凌晨进行升级维护…", "2025-09-20 15:30:00", "admin");
      announcement(announcements, "关于加强疫情防控措施的通知", "请所有进入门诊人员佩戴口罩…", "2025-08-15 09:00:00", "admin");
      announcement(announcements, "阳光医院将新增儿科专家门诊", "从下月起，我院新增儿科专家门诊…", "2025-08-01 08:30:00", "admin");

      // —— 意见反馈 ——
      Feedback f = new Feedback();
      f.setUserName("张患者");
      f.setContent("希望增加夜间门诊服务");
      f.setContact("138****5678");
      f.setSubmittedAt("2026-08-09");
      f.setStatus("pending");
      feedbacks.save(f);

      // —— 评价 ——
      review(reviews, "刘芳", d1, 5, "张医生非常专业，态度很好，详细解释了病情和治疗方案", "2026-08-06", "shown");
      review(reviews, "陈明", d2, 5, "李医生医术精湛，对妇科问题判断很准确，推荐！", "2026-08-05", "shown");
      review(reviews, "孙伟", d3, 3, "排队时间有点长，医生看诊时间偏短", "2026-08-04", "shown");

      // —— 预约规则 ——
      AppointmentRule rule = new AppointmentRule();
      rule.setAdvanceDays(7);
      rule.setSameDayCutoff("17:00");
      rule.setCancelRule("就诊前2小时可取消");
      rule.setNoshowLimit(3);
      rules.save(rule);

      // —— 操作日志 ——
      oplog(logs, "admin", "修改了机构信息", "192.168.1.100", "2026-08-07 09:15:23");
      oplog(logs, "operator01", "新增医生：赵六", "192.168.1.101", "2026-08-06 14:30:12");
    };
  }

  private Doctor doctor(DoctorRepository r, String name, String title, Department dept, String specialty, int years, int goodRate, int fee) {
    Doctor d = new Doctor();
    d.setName(name);
    d.setTitle(title);
    d.setDepartment(dept);
    d.setSpecialty(specialty);
    d.setYears(years);
    d.setGoodRate(goodRate);
    d.setFee(fee);
    return r.save(d);
  }

  private void schedule(ScheduleRepository r, Doctor doc, String date, String slot, int quota, int booked) {
    Schedule s = new Schedule();
    s.setDoctor(doc);
    s.setDate(date);
    s.setSlot(slot);
    s.setQuota(quota);
    s.setBooked(booked);
    s.setStatus(booked >= quota ? "full" : "open");
    r.save(s);
  }

  private void patient(PatientRepository r, String name, String gender, int age, String phone, int count, String tags, String reg, String status) {
    Patient p = new Patient();
    p.setName(name);
    p.setGender(gender);
    p.setAge(age);
    p.setPhone(phone);
    p.setAppointmentCount(count);
    p.setTags(tags);
    p.setRegisteredAt(reg);
    p.setStatus(status);
    r.save(p);
  }

  private void appointment(AppointmentRepository r, String code, String name, String phone, Department dept, Doctor doc, String date, String slot, int amount, String status) {
    Appointment a = new Appointment();
    a.setCode(code);
    a.setPatientName(name);
    a.setPhone(phone);
    a.setDepartment(dept);
    a.setDoctor(doc);
    a.setDate(date);
    a.setSlot(slot);
    a.setAmount(amount);
    a.setStatus(status);
    r.save(a);
  }

  private void order(OrderRepository r, String code, String name, Doctor doc, Department dept, int amountFen, String status, String paidAt, String method) {
    Order o = new Order();
    o.setCode(code);
    o.setPatientName(name);
    o.setDoctor(doc);
    o.setDepartment(dept);
    o.setAmount(amountFen);
    o.setStatus(status);
    o.setPaidAt(paidAt);
    o.setPayMethod(method);
    r.save(o);
  }

  private void notify(NotificationRepository r, String name, String type, String scene, String status) {
    Notification n = new Notification();
    n.setName(name);
    n.setType(type);
    n.setScene(scene);
    n.setStatus(status);
    r.save(n);
  }

  private NewsCategory newsCategory(NewsCategoryRepository r, int no, String name) {
    NewsCategory c = new NewsCategory();
    c.setNo(no);
    c.setName(name);
    return r.save(c);
  }

  private void news(NewsRepository r, String title, NewsCategory cat, String type, String created) {
    News n = new News();
    n.setTitle(title);
    n.setCategory(cat);
    n.setType(type);
    r.save(n);
  }

  private void announcement(AnnouncementRepository r, String title, String content, String publishedAt, String publisher) {
    Announcement a = new Announcement();
    a.setTitle(title);
    a.setContent(content);
    a.setPublishedAt(publishedAt);
    a.setPublisher(publisher);
    r.save(a);
  }

  private void oplog(OperationLogRepository r, String operator, String content, String ip, String at) {
    OperationLog l = new OperationLog();
    l.setOperator(operator);
    l.setContent(content);
    l.setIp(ip);
    l.setOperatedAt(at);
    r.save(l);
  }

  private void review(ReviewRepository r, String patientName, Doctor doc, int score, String content, String at, String status) {
    Review v = new Review();
    v.setPatientName(patientName);
    v.setDoctor(doc);
    v.setScore(score);
    v.setContent(content);
    v.setStatus(status);
    v.setReviewedAt(at);
    r.save(v);
  }
}