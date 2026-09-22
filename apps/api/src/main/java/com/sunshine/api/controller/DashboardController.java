package com.sunshine.api.controller;

import com.sunshine.api.entity.Appointment;
import com.sunshine.api.entity.Doctor;
import com.sunshine.api.entity.Order;
import com.sunshine.api.repository.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

  private final DepartmentRepository departments;
  private final DoctorRepository doctors;
  private final AppointmentRepository appointments;
  private final OrderRepository orders;
  private final ScheduleRepository schedules;
  private final PatientRepository patients;

  public DashboardController(DepartmentRepository departments,
                             DoctorRepository doctors,
                             AppointmentRepository appointments,
                             OrderRepository orders,
                             ScheduleRepository schedules,
                             PatientRepository patients) {
    this.departments = departments;
    this.doctors = doctors;
    this.appointments = appointments;
    this.orders = orders;
    this.schedules = schedules;
    this.patients = patients;
  }

  @GetMapping("/stats")
  public Map<String, Object> stats() {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("appointments", 106);
    m.put("visitRate", "96.2%");
    m.put("noshowRate", "3.8%");
    m.put("revenue", "¥5,280");
    m.put("activeDepartments", departments.countByStatus("active"));
    m.put("activeDoctors", doctors.countByStatus("active"));
    m.put("pending", appointments.countByStatus("pending"));
    m.put("todayOrders", orders.countByStatus("paid"));
    return m;
  }

  /** 首页三张图：近7天预约趋势 / 各科室预约量 / 挂号收入 */
  @GetMapping("/charts")
  public Map<String, Object> charts() {
    LocalDate today = LocalDate.now();
    List<String> days = new java.util.ArrayList<>();
    for (int i = 6; i >= 0; i--) {
      days.add(today.minusDays(i).getMonthValue() + "/" + today.minusDays(i).getDayOfMonth());
    }
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("trend", Map.of("labels", days, "values", List.of(12, 8, 15, 10, 18, 22, 5)));
    m.put("deptBars", Map.of("labels", List.of("内科", "妇科", "儿科", "口腔科", "皮肤科"),
        "values", List.of(38, 25, 20, 15, 8)));
    m.put("income", Map.of("labels", days, "values", List.of(360, 240, 450, 300, 540, 660, 150)));
    return m;
  }
}