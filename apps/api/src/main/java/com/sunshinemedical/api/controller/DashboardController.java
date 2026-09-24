package com.sunshinemedical.api.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

  @GetMapping("/stats")
  public Map<String, Object> stats() {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("total", 0);
    return m;
  }

  /** 图表数据：闸门后按 screen.stats / visual-ir 补充聚合逻辑 */
  @GetMapping("/charts")
  public Map<String, Object> charts() {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("labels", List.of());
    m.put("values", List.of());
    return m;
  }
}
