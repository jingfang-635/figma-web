package com.sunshinemedical.api.config;

import com.sunshinemedical.api.entity.AdminUser;
import com.sunshinemedical.api.repository.AdminUserRepository;
import com.sunshinemedical.api.entity.Department;
import com.sunshinemedical.api.repository.DepartmentRepository;
import com.sunshinemedical.api.entity.Doctor;
import com.sunshinemedical.api.repository.DoctorRepository;
import com.sunshinemedical.api.entity.Schedule;
import com.sunshinemedical.api.repository.ScheduleRepository;
import com.sunshinemedical.api.entity.Organization;
import com.sunshinemedical.api.repository.OrganizationRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

/** Seed：闸门账号 + 各实体种子数据（值来自 spec.entities[].seedRows 或占位） */
@Configuration
public class SeedConfig {

  @Bean
  ApplicationRunner seed(
      AdminUserRepository adminUsers,
      DepartmentRepository departmentRepo,
      DoctorRepository doctorRepo,
      ScheduleRepository scheduleRepo,
      OrganizationRepository organizationRepo,
      PasswordEncoder encoder,
      @Value("${app.seed-admin.email}") String adminEmail,
      @Value("${app.seed-admin.username}") String adminUsername,
      @Value("${app.seed-admin.password}") String adminPassword) {
    return args -> {
      if (adminUsers.count() == 0) {
        AdminUser admin = new AdminUser();
        admin.setEmail(adminEmail);
        admin.setUsername(adminUsername);
        admin.setPassword(encoder.encode(adminPassword));
        admin.setName("管理员");
        admin.setStatus("active");
        adminUsers.save(admin);
      }

      // —— Department ——
      if (departmentRepo.count() == 0) {
      {
        Department row0 = new Department();
        row0.setName("内科");
        row0.setIcon("");
        row0.setDescription("重症、发热、咳嗽等");
        row0.setSort(1);
        row0.setStatus("active");
        departmentRepo.save(row0);
      }
      {
        Department row1 = new Department();
        row1.setName("儿科");
        row1.setIcon("");
        row1.setDescription("儿童保健、常见疾病");
        row1.setSort(2);
        row1.setStatus("active");
        departmentRepo.save(row1);
      }
      {
        Department row2 = new Department();
        row2.setName("妇科");
        row2.setIcon("");
        row2.setDescription("妇科炎症、月经不调");
        row2.setSort(3);
        row2.setStatus("active");
        departmentRepo.save(row2);
      }
      {
        Department row3 = new Department();
        row3.setName("口腔科");
        row3.setIcon("");
        row3.setDescription("牙痛、龋齿、牙周炎");
        row3.setSort(4);
        row3.setStatus("active");
        departmentRepo.save(row3);
      }
      {
        Department row4 = new Department();
        row4.setName("皮肤科");
        row4.setIcon("");
        row4.setDescription("皮炎、湿疹、过敏等");
        row4.setSort(5);
        row4.setStatus("active");
        departmentRepo.save(row4);
      }
      }

      // —— Doctor ——
      if (doctorRepo.count() == 0) {
      {
        Doctor row0 = new Doctor();
        row0.setName("张伟");
        row0.setAvatar("");
        row0.setTitle("副主任医师");
        row0.setDeptId("1");
        row0.setSpecialty("高血压、糖尿病、冠心病等慢性病...");
        row0.setYears(15);
        row0.setGoodRate(99);
        row0.setFee(30);
        row0.setStatus("active");
        doctorRepo.save(row0);
      }
      {
        Doctor row1 = new Doctor();
        row1.setName("李娜");
        row1.setAvatar("");
        row1.setTitle("主任医师 副教授");
        row1.setDeptId("3");
        row1.setSpecialty("妇科炎症、月经不调、宫颈疾病、...");
        row1.setYears(16);
        row1.setGoodRate(99);
        row1.setFee(30);
        row1.setStatus("active");
        doctorRepo.save(row1);
      }
      {
        Doctor row2 = new Doctor();
        row2.setName("王磊");
        row2.setAvatar("");
        row2.setTitle("主治医师");
        row2.setDeptId("2");
        row2.setSpecialty("儿童感冒、咳嗽、发热等常见病");
        row2.setYears(10);
        row2.setGoodRate(98);
        row2.setFee(25);
        row2.setStatus("active");
        doctorRepo.save(row2);
      }
      {
        Doctor row3 = new Doctor();
        row3.setName("王磊");
        row3.setAvatar("");
        row3.setTitle("主治医师");
        row3.setDeptId("4");
        row3.setSpecialty("牙体牙髓、牙周疾病");
        row3.setYears(9);
        row3.setGoodRate(98);
        row3.setFee(35);
        row3.setStatus("active");
        doctorRepo.save(row3);
      }
      }

      // —— Schedule ——
      if (scheduleRepo.count() == 0) {
      // 日期相对化：spec 种子日期写死会让「本月/近7天」聚合在原型日期之后恒为 0；
      // 保持 quota/booked/status 不变，映射到 今天-6..今天-2（趋势形态与原型一致）
      java.time.LocalDate __today = java.time.LocalDate.now();
      final String D1 = __today.minusDays(6).toString();
      final String D2 = __today.minusDays(5).toString();
      final String D3 = __today.minusDays(4).toString();
      final String D4 = __today.minusDays(3).toString();
      final String D5 = __today.minusDays(2).toString();
      {
        Schedule row0 = new Schedule();
        row0.setDoctorId("1");
        row0.setWorkDate(D1);
        row0.setSlot("am");
        row0.setQuota(30);
        row0.setBooked(12);
        row0.setStatus("open");
        row0.setRemark("");
        scheduleRepo.save(row0);
      }
      {
        Schedule row1 = new Schedule();
        row1.setDoctorId("1");
        row1.setWorkDate(D2);
        row1.setSlot("am");
        row1.setQuota(20);
        row1.setBooked(20);
        row1.setStatus("open");
        row1.setRemark("");
        scheduleRepo.save(row1);
      }
      {
        Schedule row2 = new Schedule();
        row2.setDoctorId("2");
        row2.setWorkDate(D1);
        row2.setSlot("pm");
        row2.setQuota(40);
        row2.setBooked(15);
        row2.setStatus("open");
        row2.setRemark("");
        scheduleRepo.save(row2);
      }
      {
        Schedule row3 = new Schedule();
        row3.setDoctorId("3");
        row3.setWorkDate(D2);
        row3.setSlot("am");
        row3.setQuota(25);
        row3.setBooked(5);
        row3.setStatus("open");
        row3.setRemark("");
        scheduleRepo.save(row3);
      }
      {
        Schedule row4 = new Schedule();
        row4.setDoctorId("2");
        row4.setWorkDate(D2);
        row4.setSlot("pm");
        row4.setQuota(20);
        row4.setBooked(8);
        row4.setStatus("open");
        row4.setRemark("");
        scheduleRepo.save(row4);
      }
      {
        Schedule row5 = new Schedule();
        row5.setDoctorId("3");
        row5.setWorkDate(D3);
        row5.setSlot("am");
        row5.setQuota(30);
        row5.setBooked(10);
        row5.setStatus("open");
        row5.setRemark("");
        scheduleRepo.save(row5);
      }
      {
        Schedule row6 = new Schedule();
        row6.setDoctorId("4");
        row6.setWorkDate(D3);
        row6.setSlot("pm");
        row6.setQuota(20);
        row6.setBooked(0);
        row6.setStatus("closed");
        row6.setRemark("");
        scheduleRepo.save(row6);
      }
      {
        Schedule row7 = new Schedule();
        row7.setDoctorId("4");
        row7.setWorkDate(D4);
        row7.setSlot("am");
        row7.setQuota(15);
        row7.setBooked(7);
        row7.setStatus("open");
        row7.setRemark("");
        scheduleRepo.save(row7);
      }
      {
        Schedule row8 = new Schedule();
        row8.setDoctorId("1");
        row8.setWorkDate(D5);
        row8.setSlot("am");
        row8.setQuota(50);
        row8.setBooked(30);
        row8.setStatus("open");
        row8.setRemark("");
        scheduleRepo.save(row8);
      }
      }

      // —— Organization ——
      if (organizationRepo.count() == 0) {
      {
        Organization row0 = new Organization();
        row0.setName("阳光医疗门诊");
        row0.setPhone("010-8888 8888");
        row0.setSubtitle("以患者为中心 · 专业守护健康");
        row0.setHours("周一至周日 08:00-17:30");
        row0.setAddress("北京市示范区健康路 88 号");
        row0.setIntro("正规医疗机构，拥有专业医疗团队，为患者提供贴心、便捷的门诊服务。");
        organizationRepo.save(row0);
      }
      }
    };
  }
}
