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

import java.time.LocalDate;
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
      @Value("${app.seed-admin.name:}") String adminName,
      @Value("${app.seed-admin.password}") String adminPassword) {
    return args -> {
      if (adminUsers.count() == 0) {
        AdminUser admin = new AdminUser();
        admin.setEmail(adminEmail);
        admin.setUsername(adminUsername);
        admin.setPassword(encoder.encode(adminPassword));
        admin.setName(adminName == null || adminName.isEmpty() ? "管理员" : adminName);
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
      {
        Doctor row4 = new Doctor();
        row4.setName("陈静");
        row4.setAvatar("");
        row4.setTitle("副主任医师");
        row4.setDeptId("3");
        row4.setSpecialty("妇科内分泌、备孕指导");
        row4.setYears(12);
        row4.setGoodRate(98);
        row4.setFee(30);
        row4.setStatus("active");
        doctorRepo.save(row4);
      }
      {
        Doctor row5 = new Doctor();
        row5.setName("刘洋");
        row5.setAvatar("");
        row5.setTitle("主治医师");
        row5.setDeptId("1");
        row5.setSpecialty("呼吸系统感染、慢性咳嗽");
        row5.setYears(8);
        row5.setGoodRate(97);
        row5.setFee(25);
        row5.setStatus("active");
        doctorRepo.save(row5);
      }
      {
        Doctor row6 = new Doctor();
        row6.setName("赵强");
        row6.setAvatar("");
        row6.setTitle("副主任医师");
        row6.setDeptId("2");
        row6.setSpecialty("儿童哮喘、过敏性疾病");
        row6.setYears(13);
        row6.setGoodRate(98);
        row6.setFee(30);
        row6.setStatus("active");
        doctorRepo.save(row6);
      }
      {
        Doctor row7 = new Doctor();
        row7.setName("周敏");
        row7.setAvatar("");
        row7.setTitle("主治医师");
        row7.setDeptId("2");
        row7.setSpecialty("儿童生长发育评估");
        row7.setYears(7);
        row7.setGoodRate(97);
        row7.setFee(25);
        row7.setStatus("active");
        doctorRepo.save(row7);
      }
      {
        Doctor row8 = new Doctor();
        row8.setName("吴桐");
        row8.setAvatar("");
        row8.setTitle("主治医师");
        row8.setDeptId("2");
        row8.setSpecialty("新生儿黄疸、喂养指导");
        row8.setYears(6);
        row8.setGoodRate(96);
        row8.setFee(25);
        row8.setStatus("active");
        doctorRepo.save(row8);
      }
      {
        Doctor row9 = new Doctor();
        row9.setName("郑凯");
        row9.setAvatar("");
        row9.setTitle("副主任医师");
        row9.setDeptId("2");
        row9.setSpecialty("儿童消化系统疾病");
        row9.setYears(11);
        row9.setGoodRate(98);
        row9.setFee(30);
        row9.setStatus("active");
        doctorRepo.save(row9);
      }
      {
        Doctor row10 = new Doctor();
        row10.setName("孙悦");
        row10.setAvatar("");
        row10.setTitle("主治医师");
        row10.setDeptId("2");
        row10.setSpecialty("儿童呼吸道感染");
        row10.setYears(9);
        row10.setGoodRate(97);
        row10.setFee(25);
        row10.setStatus("active");
        doctorRepo.save(row10);
      }
      {
        Doctor row11 = new Doctor();
        row11.setName("马超");
        row11.setAvatar("");
        row11.setTitle("主治医师");
        row11.setDeptId("2");
        row11.setSpecialty("儿童急诊常见病");
        row11.setYears(8);
        row11.setGoodRate(96);
        row11.setFee(25);
        row11.setStatus("active");
        doctorRepo.save(row11);
      }
      {
        Doctor row12 = new Doctor();
        row12.setName("朱琳");
        row12.setAvatar("");
        row12.setTitle("医师");
        row12.setDeptId("2");
        row12.setSpecialty("儿童保健与疫苗接种");
        row12.setYears(5);
        row12.setGoodRate(96);
        row12.setFee(20);
        row12.setStatus("active");
        doctorRepo.save(row12);
      }
      {
        Doctor row13 = new Doctor();
        row13.setName("胡兵");
        row13.setAvatar("");
        row13.setTitle("主治医师");
        row13.setDeptId("2");
        row13.setSpecialty("儿童泌尿系统疾病");
        row13.setYears(10);
        row13.setGoodRate(97);
        row13.setFee(25);
        row13.setStatus("active");
        doctorRepo.save(row13);
      }
      {
        Doctor row14 = new Doctor();
        row14.setName("高翔");
        row14.setAvatar("");
        row14.setTitle("副主任医师");
        row14.setDeptId("2");
        row14.setSpecialty("儿童心血管疾病");
        row14.setYears(14);
        row14.setGoodRate(98);
        row14.setFee(35);
        row14.setStatus("active");
        doctorRepo.save(row14);
      }
      {
        Doctor row15 = new Doctor();
        row15.setName("林芳");
        row15.setAvatar("");
        row15.setTitle("主治医师");
        row15.setDeptId("3");
        row15.setSpecialty("妇科常见病、宫颈筛查");
        row15.setYears(9);
        row15.setGoodRate(97);
        row15.setFee(25);
        row15.setStatus("active");
        doctorRepo.save(row15);
      }
      {
        Doctor row16 = new Doctor();
        row16.setName("何静");
        row16.setAvatar("");
        row16.setTitle("副主任医师");
        row16.setDeptId("3");
        row16.setSpecialty("围产期保健");
        row16.setYears(12);
        row16.setGoodRate(98);
        row16.setFee(30);
        row16.setStatus("active");
        doctorRepo.save(row16);
      }
      {
        Doctor row17 = new Doctor();
        row17.setName("罗敏");
        row17.setAvatar("");
        row17.setTitle("医师");
        row17.setDeptId("3");
        row17.setSpecialty("计划生育咨询");
        row17.setYears(5);
        row17.setGoodRate(96);
        row17.setFee(20);
        row17.setStatus("active");
        doctorRepo.save(row17);
      }
      {
        Doctor row18 = new Doctor();
        row18.setName("谢婷");
        row18.setAvatar("");
        row18.setTitle("主治医师");
        row18.setDeptId("3");
        row18.setSpecialty("妇科肿瘤筛查");
        row18.setYears(8);
        row18.setGoodRate(97);
        row18.setFee(25);
        row18.setStatus("active");
        doctorRepo.save(row18);
      }
      {
        Doctor row19 = new Doctor();
        row19.setName("徐蕾");
        row19.setAvatar("");
        row19.setTitle("主治医师");
        row19.setDeptId("5");
        row19.setSpecialty("皮炎、湿疹、荨麻疹");
        row19.setYears(9);
        row19.setGoodRate(97);
        row19.setFee(25);
        row19.setStatus("active");
        doctorRepo.save(row19);
      }
      }

      // —— Schedule ——
      if (scheduleRepo.count() == 0) {
      {
        Schedule row0 = new Schedule();
        row0.setDoctorId("1");
        row0.setWorkDate(LocalDate.now().plusDays(-9).toString());
        row0.setSlot("am");
        row0.setQuota(30);
        row0.setBooked(8);
        row0.setVisited(8);
        row0.setStatus("open");
        row0.setRemark("");
        scheduleRepo.save(row0);
      }
      {
        Schedule row1 = new Schedule();
        row1.setDoctorId("2");
        row1.setWorkDate(LocalDate.now().plusDays(-7).toString());
        row1.setSlot("pm");
        row1.setQuota(30);
        row1.setBooked(8);
        row1.setVisited(8);
        row1.setStatus("open");
        row1.setRemark("");
        scheduleRepo.save(row1);
      }
      {
        Schedule row2 = new Schedule();
        row2.setDoctorId("1");
        row2.setWorkDate(LocalDate.now().plusDays(-6).toString());
        row2.setSlot("am");
        row2.setQuota(20);
        row2.setBooked(6);
        row2.setVisited(5);
        row2.setStatus("open");
        row2.setRemark("");
        scheduleRepo.save(row2);
      }
      {
        Schedule row3 = new Schedule();
        row3.setDoctorId("2");
        row3.setWorkDate(LocalDate.now().plusDays(-6).toString());
        row3.setSlot("pm");
        row3.setQuota(20);
        row3.setBooked(2);
        row3.setVisited(2);
        row3.setStatus("open");
        row3.setRemark("");
        scheduleRepo.save(row3);
      }
      {
        Schedule row4 = new Schedule();
        row4.setDoctorId("3");
        row4.setWorkDate(LocalDate.now().plusDays(-6).toString());
        row4.setSlot("am");
        row4.setQuota(25);
        row4.setBooked(4);
        row4.setVisited(4);
        row4.setStatus("open");
        row4.setRemark("");
        scheduleRepo.save(row4);
      }
      {
        Schedule row5 = new Schedule();
        row5.setDoctorId("3");
        row5.setWorkDate(LocalDate.now().plusDays(-5).toString());
        row5.setSlot("am");
        row5.setQuota(20);
        row5.setBooked(5);
        row5.setVisited(5);
        row5.setStatus("open");
        row5.setRemark("");
        scheduleRepo.save(row5);
      }
      {
        Schedule row6 = new Schedule();
        row6.setDoctorId("20");
        row6.setWorkDate(LocalDate.now().plusDays(-5).toString());
        row6.setSlot("pm");
        row6.setQuota(15);
        row6.setBooked(3);
        row6.setVisited(3);
        row6.setStatus("open");
        row6.setRemark("");
        scheduleRepo.save(row6);
      }
      {
        Schedule row7 = new Schedule();
        row7.setDoctorId("1");
        row7.setWorkDate(LocalDate.now().plusDays(-4).toString());
        row7.setSlot("am");
        row7.setQuota(30);
        row7.setBooked(7);
        row7.setVisited(7);
        row7.setStatus("open");
        row7.setRemark("");
        scheduleRepo.save(row7);
      }
      {
        Schedule row8 = new Schedule();
        row8.setDoctorId("2");
        row8.setWorkDate(LocalDate.now().plusDays(-4).toString());
        row8.setSlot("pm");
        row8.setQuota(25);
        row8.setBooked(5);
        row8.setVisited(4);
        row8.setStatus("open");
        row8.setRemark("");
        scheduleRepo.save(row8);
      }
      {
        Schedule row9 = new Schedule();
        row9.setDoctorId("4");
        row9.setWorkDate(LocalDate.now().plusDays(-4).toString());
        row9.setSlot("am");
        row9.setQuota(15);
        row9.setBooked(3);
        row9.setVisited(3);
        row9.setStatus("open");
        row9.setRemark("");
        scheduleRepo.save(row9);
      }
      {
        Schedule row10 = new Schedule();
        row10.setDoctorId("5");
        row10.setWorkDate(LocalDate.now().plusDays(-3).toString());
        row10.setSlot("am");
        row10.setQuota(25);
        row10.setBooked(6);
        row10.setVisited(6);
        row10.setStatus("open");
        row10.setRemark("");
        scheduleRepo.save(row10);
      }
      {
        Schedule row11 = new Schedule();
        row11.setDoctorId("7");
        row11.setWorkDate(LocalDate.now().plusDays(-3).toString());
        row11.setSlot("pm");
        row11.setQuota(20);
        row11.setBooked(4);
        row11.setVisited(4);
        row11.setStatus("open");
        row11.setRemark("");
        scheduleRepo.save(row11);
      }
      {
        Schedule row12 = new Schedule();
        row12.setDoctorId("6");
        row12.setWorkDate(LocalDate.now().plusDays(-2).toString());
        row12.setSlot("am");
        row12.setQuota(30);
        row12.setBooked(8);
        row12.setVisited(7);
        row12.setStatus("open");
        row12.setRemark("");
        scheduleRepo.save(row12);
      }
      {
        Schedule row13 = new Schedule();
        row13.setDoctorId("3");
        row13.setWorkDate(LocalDate.now().plusDays(-2).toString());
        row13.setSlot("am");
        row13.setQuota(25);
        row13.setBooked(6);
        row13.setVisited(6);
        row13.setStatus("open");
        row13.setRemark("");
        scheduleRepo.save(row13);
      }
      {
        Schedule row14 = new Schedule();
        row14.setDoctorId("20");
        row14.setWorkDate(LocalDate.now().plusDays(-2).toString());
        row14.setSlot("pm");
        row14.setQuota(20);
        row14.setBooked(4);
        row14.setVisited(4);
        row14.setStatus("open");
        row14.setRemark("");
        scheduleRepo.save(row14);
      }
      {
        Schedule row15 = new Schedule();
        row15.setDoctorId("1");
        row15.setWorkDate(LocalDate.now().plusDays(-1).toString());
        row15.setSlot("am");
        row15.setQuota(40);
        row15.setBooked(10);
        row15.setVisited(9);
        row15.setStatus("open");
        row15.setRemark("");
        scheduleRepo.save(row15);
      }
      {
        Schedule row16 = new Schedule();
        row16.setDoctorId("2");
        row16.setWorkDate(LocalDate.now().plusDays(-1).toString());
        row16.setSlot("pm");
        row16.setQuota(30);
        row16.setBooked(7);
        row16.setVisited(7);
        row16.setStatus("open");
        row16.setRemark("");
        scheduleRepo.save(row16);
      }
      {
        Schedule row17 = new Schedule();
        row17.setDoctorId("7");
        row17.setWorkDate(LocalDate.now().plusDays(-1).toString());
        row17.setSlot("am");
        row17.setQuota(20);
        row17.setBooked(5);
        row17.setVisited(5);
        row17.setStatus("open");
        row17.setRemark("");
        scheduleRepo.save(row17);
      }
      {
        Schedule row18 = new Schedule();
        row18.setDoctorId("1");
        row18.setWorkDate(LocalDate.now().plusDays(0).toString());
        row18.setSlot("am");
        row18.setQuota(20);
        row18.setBooked(2);
        row18.setVisited(2);
        row18.setStatus("open");
        row18.setRemark("");
        scheduleRepo.save(row18);
      }
      {
        Schedule row19 = new Schedule();
        row19.setDoctorId("2");
        row19.setWorkDate(LocalDate.now().plusDays(0).toString());
        row19.setSlot("am");
        row19.setQuota(20);
        row19.setBooked(1);
        row19.setVisited(1);
        row19.setStatus("open");
        row19.setRemark("");
        scheduleRepo.save(row19);
      }
      {
        Schedule row20 = new Schedule();
        row20.setDoctorId("3");
        row20.setWorkDate(LocalDate.now().plusDays(0).toString());
        row20.setSlot("am");
        row20.setQuota(20);
        row20.setBooked(1);
        row20.setVisited(1);
        row20.setStatus("open");
        row20.setRemark("");
        scheduleRepo.save(row20);
      }
      {
        Schedule row21 = new Schedule();
        row21.setDoctorId("4");
        row21.setWorkDate(LocalDate.now().plusDays(0).toString());
        row21.setSlot("am");
        row21.setQuota(15);
        row21.setBooked(1);
        row21.setVisited(1);
        row21.setStatus("open");
        row21.setRemark("");
        scheduleRepo.save(row21);
      }
      {
        Schedule row22 = new Schedule();
        row22.setDoctorId("5");
        row22.setWorkDate(LocalDate.now().plusDays(0).toString());
        row22.setSlot("pm");
        row22.setQuota(20);
        row22.setBooked(0);
        row22.setVisited(0);
        row22.setStatus("open");
        row22.setRemark("");
        scheduleRepo.save(row22);
      }
      {
        Schedule row23 = new Schedule();
        row23.setDoctorId("20");
        row23.setWorkDate(LocalDate.now().plusDays(0).toString());
        row23.setSlot("am");
        row23.setQuota(15);
        row23.setBooked(0);
        row23.setVisited(0);
        row23.setStatus("open");
        row23.setRemark("");
        scheduleRepo.save(row23);
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
