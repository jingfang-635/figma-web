package com.sunshinemedical.api.controller;

import com.sunshinemedical.api.entity.Department;
import com.sunshinemedical.api.entity.Schedule;
import com.sunshinemedical.api.repository.DepartmentRepository;
import com.sunshinemedical.api.repository.ScheduleRepository;
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

  private final ScheduleRepository schedules;
  private final DepartmentRepository departments;

  public DashboardController(ScheduleRepository schedules, DepartmentRepository departments) {
    this.schedules = schedules;
    this.departments = departments;
  }

  /** KPI：本月预约量 / 就诊率 / 爽约率 / 本月收入（与 Figma 文本口径一致） */
  @GetMapping("/stats")
  public Map<String, Object> stats() {
    LocalDate now = LocalDate.now();
    String ym = now.format(DateTimeFormatter.ofPattern("yyyy-MM"));
    List<Schedule> rows = schedules.findAll().stream()
        .filter(s -> s.getWorkDate() != null && s.getWorkDate().startsWith(ym))
        .toList();

    int quota = rows.stream().mapToInt(s -> nz(s.getQuota())).sum();
    int booked = rows.stream().mapToInt(s -> nz(s.getBooked())).sum();
    // 收入口径：与挂号费相关；demo 数据按预约人次 × ¥30 估算（真实计费接入后替换）
    long revenue = booked * 30L;

    Map<String, Object> m = new LinkedHashMap<>();
    m.put("appointments", booked);
    m.put("visitRate", pct(booked, quota));
    m.put("noshowRate", pct(quota - booked, quota));
    m.put("revenue", "¥" + String.format("%,d", revenue));
    return m;
  }

  /** 图表：近7天预约趋势 / 各科室预约量（近7天）/ 近7天挂号收入 */
  @GetMapping("/charts")
  public Map<String, Object> charts() {
    LocalDate today = LocalDate.now();
    DateTimeFormatter md = DateTimeFormatter.ofPattern("M/d");
    List<Schedule> all = schedules.findAll();

    // 近 7 天（含今日）标签
    List<String> days = new ArrayList<>();
    for (int i = 6; i >= 0; i--) days.add(today.minusDays(i).format(md));

    Map<String, Object> m = new LinkedHashMap<>();

    // 1) 预约量趋势：按 workDate 聚合 booked
    List<Integer> trend = new ArrayList<>();
    for (int i = 6; i >= 0; i--) {
      String d = today.minusDays(i).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
      final String day = d;
      trend.add(all.stream().filter(s -> day.equals(s.getWorkDate())).mapToInt(s -> nz(s.getBooked())).sum());
    }
    m.put("trend", Map.of("labels", days, "values", trend));

    // 2) 各科室预约量：booked 按 doctor → dept 聚合（demo 简化：按 schedule 分布折算）
    Map<String, Integer> byDept = new LinkedHashMap<>();
    for (Department d : departments.findAll()) byDept.put(d.getName(), 0);
    int idx = 0;
    for (Map.Entry<String, Integer> e : byDept.entrySet()) {
      // 无 doctor→dept 关联查询时按科室顺序近似均分；真实关联接入后替换
      byDept.put(e.getKey(), Math.round(all.size() > 0 ? bookedSum(all) / (float) byDept.size() : 0));
      idx++;
    }
    m.put("deptBars", Map.of("labels", new ArrayList<>(byDept.keySet()), "values", new ArrayList<>(byDept.values())));

    // 3) 收入趋势：预约量 × ¥30
    List<Integer> income = trend.stream().map(v -> v * 30).toList();
    m.put("income", Map.of("labels", days, "values", income));

    return m;
  }

  private int nz(Integer v) {
    return v == null ? 0 : v;
  }

  private int bookedSum(List<Schedule> rows) {
    return rows.stream().mapToInt(s -> nz(s.getBooked())).sum();
  }

  private String pct(int part, int whole) {
    if (whole <= 0) return "0%";
    return Math.round(part * 1000f / whole) / 10f + "%";
  }
}