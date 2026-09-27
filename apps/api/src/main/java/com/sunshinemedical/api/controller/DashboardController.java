package com.sunshinemedical.api.controller;

import com.sunshinemedical.api.entity.Schedule;
import com.sunshinemedical.api.repository.ScheduleRepository;
import com.sunshinemedical.api.entity.Department;
import com.sunshinemedical.api.repository.DepartmentRepository;
import com.sunshinemedical.api.entity.Doctor;
import com.sunshinemedical.api.repository.DoctorRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

  private static final DateTimeFormatter MD = DateTimeFormatter.ofPattern("M/d");

  private final ScheduleRepository scheduleRepo;
  private final DepartmentRepository departmentRepo;
  private final DoctorRepository doctorRepo;

  public DashboardController(ScheduleRepository scheduleRepo, DepartmentRepository departmentRepo, DoctorRepository doctorRepo) {
    this.scheduleRepo = scheduleRepo;
    this.departmentRepo = departmentRepo;
    this.doctorRepo = doctorRepo;
  }

  /** KPI：按库内数据实时聚合（窗口/字段来自 spec.dashboard，禁止前端兜底造假） */
  @GetMapping("/stats")
  public Map<String, Object> stats() {
    LocalDate today = LocalDate.now();
    String ym = today.format(DateTimeFormatter.ofPattern("yyyy-MM"));
    List<Schedule> rows = scheduleRepo.findAll();
    Map<String, Object> m = new LinkedHashMap<>();
    int appointments = rows.stream().filter(s -> inMonth(s, ym)).mapToInt(s -> num(s.getBooked())).sum();
    m.put("appointments", appointments);
    int visited = rows.stream().filter(s -> inMonth(s, ym)).mapToInt(s -> num(s.getVisited())).sum();
    m.put("visited", visited);
    int noshow = rows.stream().filter(s -> inMonth(s, ym)).mapToInt(s -> num(s.getBooked()) - num(s.getVisited())).sum();
    m.put("noshow", noshow);
    m.put("departments", (int) departmentRepo.findAll().stream().filter(t -> "active".equals(String.valueOf(t.getStatus()))).count());
    m.put("doctors", (int) rows.stream().filter(s -> isToday(s)).filter(s -> "open".equals(String.valueOf(s.getStatus()))).map(s -> s.getDoctorId()).distinct().count());
    int pending = rows.stream().filter(s -> isToday(s)).mapToInt(s -> num(s.getBooked()) - num(s.getVisited())).sum();
    m.put("pending", pending);
    int ordersToday = rows.stream().filter(s -> isToday(s)).mapToInt(s -> num(s.getBooked())).sum();
    m.put("ordersToday", ordersToday);
    m.put("visitRate", pct(visited, appointments));
    m.put("noshowRate", pct(noshow, appointments));
    long revenue = rows.stream().filter(s -> inMonth(s, ym)).mapToInt(s -> num(s.getBooked()) * relValue0(s.getDoctorId())).sum();
    m.put("revenue", money(revenue, "¥", true));
    return m;
  }

  /** 图表：窗口内逐日 / 按关联实体分组聚合 */
  @GetMapping("/charts")
  public Map<String, Object> charts() {
    LocalDate today = LocalDate.now();
    String ym = today.format(DateTimeFormatter.ofPattern("yyyy-MM"));
    List<Schedule> rows = scheduleRepo.findAll();
    Map<String, Object> m = new LinkedHashMap<>();
    List<String> trendLabels = new ArrayList<>();
    List<Integer> trendValues = new ArrayList<>();
    for (int i = 6; i >= 0; i--) {
      LocalDate day = today.minusDays(i);
      final String dayStr = day.toString();
      trendLabels.add(day.format(MD));
      trendValues.add(rows.stream().filter(s -> dayStr.equals(s.getWorkDate())).mapToInt(s -> num(s.getBooked())).sum());
    }
    m.put("trend", Map.of("labels", trendLabels, "values", trendValues));
    List<String> incomeLabels = new ArrayList<>();
    List<Integer> incomeValues = new ArrayList<>();
    for (int i = 6; i >= 0; i--) {
      LocalDate day = today.minusDays(i);
      final String dayStr = day.toString();
      incomeLabels.add(day.format(MD));
      incomeValues.add(rows.stream().filter(s -> dayStr.equals(s.getWorkDate())).mapToInt(s -> num(s.getBooked()) * relValue0(s.getDoctorId())).sum());
    }
    m.put("income", Map.of("labels", incomeLabels, "values", incomeValues));
    List<String> deptBarsLabels = new ArrayList<>();
    List<Integer> deptBarsValues = new ArrayList<>();
    for (Department g : departmentRepo.findAll()) {
      final String gid = String.valueOf(g.getId());
      deptBarsLabels.add(str(g.getName()));
      deptBarsValues.add(rows.stream().filter(s -> inLast7(s)).filter(s -> gid.equals(relKey0(s.getDoctorId()))).mapToInt(s -> num(s.getBooked())).sum());
    }
    m.put("deptBars", Map.of("labels", deptBarsLabels, "values", deptBarsValues));
    return m;
  }

  // —— 窗口 ——
  private boolean inMonth(Schedule s, String ym) {
    return s.getWorkDate() != null && s.getWorkDate().startsWith(ym);
  }

  private boolean inLast7(Schedule s) {
    LocalDate d = parseDate(s.getWorkDate());
    if (d == null) return false;
    LocalDate today = LocalDate.now();
    return !d.isBefore(today.minusDays(6)) && !d.isAfter(today);
  }

  private boolean isToday(Schedule s) {
    return LocalDate.now().toString().equals(s.getWorkDate());
  }

  private LocalDate parseDate(String v) {
    if (v == null || v.isEmpty()) return null;
    try {
      return LocalDate.parse(v);
    } catch (Exception e) {
      return null;
    }
  }

  private int num(Integer v) {
    return v == null ? 0 : v;
  }

  private String str(Object v) {
    return v == null ? "" : String.valueOf(v);
  }

  private String pct(int part, int whole) {
    if (whole <= 0) return "0%";
    return Math.round(part * 1000f / whole) / 10f + "%";
  }

  private String money(long v, String prefix, boolean grouped) {
    return prefix + (grouped ? String.format("%,d", v) : String.valueOf(v));
  }

  /** Doctor.fee（经 doctorId 关联） */
  private int relValue0(String relId) {
    if (relId == null) return 0;
    for (Doctor t : doctorRepo.findAll()) {
      if (relId.equals(String.valueOf(t.getId()))) return num(t.getFee());
    }
    return 0;
  }

  /** Doctor.deptId（经 doctorId 关联） */
  private String relKey0(String relId) {
    if (relId == null) return null;
    for (Doctor t : doctorRepo.findAll()) {
      if (relId.equals(String.valueOf(t.getId()))) return String.valueOf(t.getDeptId());
    }
    return null;
  }
}
